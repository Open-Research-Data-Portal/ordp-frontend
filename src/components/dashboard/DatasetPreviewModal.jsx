import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Download, Calendar, Tag, ExternalLink, Loader2, Database, Archive } from 'lucide-react';
import * as datasetsApi from '../../features/datasets/hooks/datasetsApi';
import TabularPreview from '../ui/TabularPreview';
import { getDatasetImage } from '../../utils/datasetImage';

export default function DatasetPreviewModal({ dataset, onClose }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!dataset?.id) return;
    let act = true;
    datasetsApi.getDatasetDetail(dataset.id)
      .then((r) => { if (act) setDetail(r); })
      .catch(() => { if (act) setDetail(dataset); })
      .finally(() => { if (act) setLoading(false); });
    return () => { act = false; };
  }, [dataset]);

  if (!dataset) return null;
  const curr = detail || dataset;
  const meta = curr?.metadata || curr || {};
  const desc = meta.description || meta.about || curr.description || 'No description.';
  const title = curr.title || meta.title || 'Untitled';
  const status = curr.status || meta.status || 'published';
  const cat = curr.category || meta.category || meta.subject_name || 'Uncategorized';
  const files = Array.isArray(curr?.files) ? curr.files : [];
  const pFile = files[0] || null;
  const tags = Array.isArray(meta.tags) ? meta.tags : (Array.isArray(curr.tags) ? curr.tags : []);
  const preview = curr?.data_preview;
  const pCols = pFile?.columns || preview?.columns || [];
  const pRows = pFile?.preview_rows || preview?.rows || preview?.preview_rows || [];

  return (
    <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4' onClick={onClose} role='dialog'>
      <div className='w-full max-w-5xl rounded-2xl border bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col' onClick={(e) => e.stopPropagation()}>
        <div className='bg-navy text-white px-6 py-4 flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-gold/25 border border-gold/40 flex items-center justify-center'>
              <Database className='w-5 h-5 text-gold' />
            </div>
            <div>
              <span className='text-[10px] font-bold uppercase tracking-wider text-gold/85 block'>Dataset Preview</span>
              <h2 className='text-base font-bold line-clamp-1'>{title}</h2>
            </div>
          </div>
          <button type='button' onClick={onClose} className='p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/15 transition' aria-label='Close'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 overflow-y-auto space-y-5 flex-1'>
          {loading ? (
            <div className='py-16 flex flex-col items-center justify-center gap-3 text-gray-400'>
              <Loader2 className='w-8 h-8 animate-spin text-gold' />
              <p className='text-xs'>Loading details...</p>
            </div>
          ) : (
            <>
              <div className='w-full flex flex-col sm:flex-row gap-4 items-center bg-[#F7F6F2] border rounded-2xl p-4'>
                <div className='w-full sm:w-32 h-24 rounded-xl bg-gray-200 overflow-hidden shrink-0'>
                  {getDatasetImage(curr) ? (
                    <img src={getDatasetImage(curr)} alt={title} className='w-full h-full object-cover' />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-navy/10 to-gold/10'>
                      <Archive className='w-8 h-8 text-navy/30' />
                    </div>
                  )}
                </div>
                <div className='space-y-1.5 flex-1 w-full'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='bg-gold/15 text-amber-900 border text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase'>{cat}</span>
                    <span className='bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase'>{status}</span>
                  </div>
                  <h3 className='text-lg font-serif font-bold text-navy'>{title}</h3>
                  <div className='flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1'>
                    <span className='flex items-center gap-1'><Calendar className='w-3.5 h-3.5' />{curr.created_at ? new Date(curr.created_at).toLocaleDateString() : '—'}</span>
                    <span className='flex items-center gap-1'><FileText className='w-3.5 h-3.5' />{files.length || curr.file_count || 1} File</span>
                    {curr.downloads != null && <span className='flex items-center gap-1'><Download className='w-3.5 h-3.5' />{curr.downloads.toLocaleString()}</span>}
                  </div>
                </div>
              </div>

              <div className='w-full space-y-2'>
                <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400'>About</h4>
                <div className='w-full bg-white border rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed'>{desc}</div>
              </div>

              {tags.length > 0 && (
                <div className='w-full space-y-2'>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400'>Tags</h4>
                  <div className='w-full flex flex-wrap gap-1.5'>
                    {tags.map((t, i) => (
                      <span key={i} className='inline-flex items-center gap-1 bg-slate-100 border text-navy text-xs px-2.5 py-1 rounded-lg'>
                        <Tag className='w-3 h-3 text-gold' />{typeof t === 'string' ? t : (t.name || JSON.stringify(t))}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className='w-full space-y-2'>
                <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between'>
                  <span>Data File Preview</span>
                  {pFile && <span className='font-mono text-gray-500 text-[11px]'>{pFile.name || 'File'}</span>}
                </h4>
                <div className='w-full bg-white border rounded-xl overflow-x-auto overflow-y-hidden shadow-xs'>
                  {pCols.length > 0 && pRows.length > 0 ? (
                    <TabularPreview columns={pCols} rows={pRows} maxRows={10} maxHeight={260} />
                  ) : (
                    <div className='p-8 text-center text-xs text-gray-400'>No tabular preview available.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className='px-6 py-4 bg-slate-50 border-t flex items-center justify-between shrink-0'>
          <button type='button' onClick={onClose} className='rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 transition'>Close</button>
          <button type='button' onClick={() => { onClose(); window.location.href = '/my-datasets/' + dataset.id; }} className='flex items-center gap-2 rounded-xl bg-navy hover:bg-navy-dark px-5 py-2 text-sm font-semibold text-white transition'>
            <span>Open Full Page</span>
            <ExternalLink className='w-4 h-4 text-gold' />
          </button>
        </div>
      </div>
    </div>
  );
}
