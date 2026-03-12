'use server';
import { desc, eq, arrayContains, or } from 'drizzle-orm';

import {
  NewDocumentParams,
  insertDocumentSchema,
  documents as documentsTable,
  DocumentParams,
} from '@/lib/db/schema/documents';
import { db } from '@/lib/db';
import { generateEmbeddings } from '@/lib/rag/embedding';
import { embeddings as embeddingsTable } from '@/lib/db/schema/embeddings';
import { addRelation, deleteRelation } from '@/lib/fga/fga';
import { getSession } from '@/lib/auth0';

export const createDocument = async (input: NewDocumentParams, text: string) => {
  const session = await getSession();
  const user = session?.user!;
  const { content, fileName, fileType, sharedWith } = insertDocumentSchema.parse(input);

  const [[document], embeddings] = await Promise.all([
    db
      .insert(documentsTable)
      .values({ content, fileName, fileType, userId: user.sub, userEmail: user.email!, sharedWith })
      .returning(),
    generateEmbeddings(text),
  ]);

  if (embeddings.length > 0) {
    await Promise.all([
      db.insert(embeddingsTable).values(
        embeddings.map((embedding) => ({
          fileName,
          documentId: document.id,
          ...embedding,
        })),
      ),
      addRelation(user.email!, document.id),
    ]);
  }

  return true;
};

export async function getDocumentsForUser(): Promise<Omit<DocumentParams, 'content'>[]> {
  const session = await getSession();
  const user = session?.user!;
  try {
    const userDocuments = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        fileType: documentsTable.fileType,
        createdAt: documentsTable.createdAt,
        updatedAt: documentsTable.updatedAt,
        sharedWith: documentsTable.sharedWith,
        userId: documentsTable.userId,
        userEmail: documentsTable.userEmail,
      })
      .from(documentsTable)
      .where(or(eq(documentsTable.userId, user.sub), arrayContains(documentsTable.sharedWith, [user.email!])))
      .orderBy(desc(documentsTable.createdAt)); // Show newest first

    return userDocuments;
  } catch (error) {
    console.error('Error fetching documents for user:', error);
    return []; // Return empty array on error or handle appropriately
  }
}

export async function getDocumentContent(documentId: string): Promise<Buffer | null> {
  try {
    const document = await db
      .select({ content: documentsTable.content })
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId));
    return document[0]?.content ?? null;
  } catch (error) {
    console.error('Error fetching document content:', error);
    return null;
  }
}

export async function shareDocument(documentId: string, sharedWith: string[]) {
  // get current shared with and merge
  const currentSharedWith = await db
    .select({ sharedWith: documentsTable.sharedWith })
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId));
  const mergedSharedWith = [...currentSharedWith[0]?.sharedWith, ...sharedWith];
  await db.update(documentsTable).set({ sharedWith: mergedSharedWith }).where(eq(documentsTable.id, documentId));
  // write the relationship tuples to FGA in parallel
  await Promise.all(sharedWith.map((user) => addRelation(user, documentId, 'viewer')));
}

export async function deleteDocument(documentId: string) {
  const session = await getSession();
  const user = session?.user!;
  // fetch sharedWith list and delete owner's FGA tuple in parallel
  const [, currentSharedWith] = await Promise.all([
    deleteRelation(user.email!, documentId),
    db
      .select({ sharedWith: documentsTable.sharedWith })
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId)),
  ]);

  // delete all shared-user FGA tuples in parallel, then delete the document
  const sharedWithList: string[] = currentSharedWith[0]?.sharedWith ?? [];
  await Promise.all(sharedWithList.map((sUser) => deleteRelation(sUser, documentId, 'viewer')));
  await db.delete(documentsTable).where(eq(documentsTable.id, documentId));
}
