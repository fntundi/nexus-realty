import React from 'react';
import ReactMarkdown from 'react-markdown';
import requirements from '@/docs/REQUIREMENTS.md?raw';

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

// Split markdown into text chunks and pipe-table chunks.
function splitBlocks(md) {
  const blocks = [];
  let text = [];
  let table = [];
  const flushText = () => { if (text.length) blocks.push({ type: 'md', value: text.join('\n') }); text = []; };
  const flushTable = () => { if (table.length) blocks.push({ type: 'table', rows: table }); table = []; };
  md.split('\n').forEach((line) => {
    if (line.trim().startsWith('|')) { flushText(); table.push(line); }
    else { flushTable(); text.push(line); }
  });
  flushText();
  flushTable();
  return blocks;
}

function Table({ rows }) {
  const [head, , ...body] = rows.map(cells);
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>{head.map((h, i) => <th key={i} className="text-left border-b-2 py-2 pr-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="border-b py-2 pr-3 align-top">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Requirements() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <article className="[&_p]:my-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_hr]:my-6">
        {splitBlocks(requirements).map((b, i) =>
          b.type === 'table' ? <Table key={i} rows={b.rows} /> : <ReactMarkdown key={i}>{b.value}</ReactMarkdown>
        )}
      </article>
    </div>
  );
}