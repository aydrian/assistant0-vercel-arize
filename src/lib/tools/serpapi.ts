import { tool } from 'ai';
import { z } from 'zod';

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

/**
 * Extract the best answer from a SerpAPI response.
 * Checks fields in priority order, matching LangChain's SerpAPI logic.
 */
function extractAnswer(res: any): string {
  const answerBox = res.answer_box_list?.[0] ?? res.answer_box;
  if (answerBox) {
    if (answerBox.result) return answerBox.result;
    if (answerBox.answer) return answerBox.answer;
    if (answerBox.snippet) return answerBox.snippet;
    if (answerBox.snippet_highlighted_words) return answerBox.snippet_highlighted_words.toString();
    // Fall back to non-array, non-object, non-URL scalar values
    const answer: Record<string, unknown> = {};
    Object.keys(answerBox)
      .filter(
        (k) =>
          !Array.isArray(answerBox[k]) &&
          typeof answerBox[k] !== 'object' &&
          !(typeof answerBox[k] === 'string' && answerBox[k].startsWith('http')),
      )
      .forEach((k) => {
        answer[k] = answerBox[k];
      });
    return JSON.stringify(answer);
  }

  if (res.events_results) return JSON.stringify(res.events_results);
  if (res.sports_results) return JSON.stringify(res.sports_results);
  if (res.top_stories) return JSON.stringify(res.top_stories);
  if (res.news_results) return JSON.stringify(res.news_results);
  if (res.jobs_results?.jobs) return JSON.stringify(res.jobs_results.jobs);
  if (res.questions_and_answers) return JSON.stringify(res.questions_and_answers);
  if (res.popular_destinations?.destinations)
    return JSON.stringify(res.popular_destinations.destinations);
  if (res.top_sights?.sights) {
    const sights = res.top_sights.sights
      .map((s: any) => ({ title: s.title, description: s.description, price: s.price }))
      .slice(0, 8);
    return JSON.stringify(sights);
  }
  if (res.shopping_results?.[0]?.title)
    return JSON.stringify(res.shopping_results.slice(0, 3));
  if (res.images_results?.[0]?.thumbnail)
    return res.images_results.map((ir: any) => ir.thumbnail).slice(0, 10).toString();

  const snippets: unknown[] = [];
  if (res.knowledge_graph) {
    if (res.knowledge_graph.description) snippets.push(res.knowledge_graph.description);
    const title = res.knowledge_graph.title || '';
    Object.keys(res.knowledge_graph)
      .filter(
        (k) =>
          typeof res.knowledge_graph[k] === 'string' &&
          k !== 'title' &&
          k !== 'description' &&
          !k.endsWith('_stick') &&
          !k.endsWith('_link') &&
          !k.startsWith('http'),
      )
      .forEach((k) => snippets.push(`${title} ${k}: ${res.knowledge_graph[k]}`));
  }

  const firstOrganic = res.organic_results?.[0];
  if (firstOrganic) {
    if (firstOrganic.snippet) snippets.push(firstOrganic.snippet);
    else if (firstOrganic.snippet_highlighted_words)
      snippets.push(firstOrganic.snippet_highlighted_words);
    else if (firstOrganic.rich_snippet) snippets.push(firstOrganic.rich_snippet);
    else if (firstOrganic.rich_snippet_table) snippets.push(firstOrganic.rich_snippet_table);
    else if (firstOrganic.link) snippets.push(firstOrganic.link);
  }

  if (res.buying_guide) snippets.push(res.buying_guide);
  if (res.local_results?.places) snippets.push(res.local_results.places);

  if (snippets.length > 0) return JSON.stringify(snippets);
  return 'No good search result found';
}

// Requires process.env.SERPAPI_API_KEY to be set: https://serpapi.com/
let toolInstance = null;

if (SERPAPI_API_KEY) {
  toolInstance = tool({
    description:
      'A search engine. Useful for when you need to answer questions about current events. Input should be a search query.',
    inputSchema: z.object({
      q: z.string().describe('The search query'),
    }),
    execute: async ({ q }) => {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.set('api_key', SERPAPI_API_KEY);
      url.searchParams.set('q', q);

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) throw new Error(`Got error from SerpAPI: ${data.error}`);

      return extractAnswer(data);
    },
  });
}

export const serpApiTool = toolInstance;
