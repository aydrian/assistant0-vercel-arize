import { ReactNode } from 'react';

export function GuideInfoBox(props: { children: ReactNode }) {
  return (
    <div className="max-w-3xl w-full overflow-hidden flex-col gap-5 flex text-md my-16 mx-auto">
      <div className="text-sm max-w-150 mx-auto text-center">{props.children}</div>
    </div>
  );
}
