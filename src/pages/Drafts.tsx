import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, MapPin, Trash2, Edit3, Inbox } from 'lucide-react'
import { deleteDraft, listDrafts, type DraftRecord } from '@/lib/drafts'
import Button from '@/components/ui/Button'

type PosDraft = DraftRecord<{ formData?: { address?: string; latitude?: number; longitude?: number } }>

const Drafts = () => {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<PosDraft[]>([])

  const refresh = () => setDrafts(listDrafts())

  useEffect(() => {
    refresh()
  }, [])

  const handleDelete = (id: string) => {
    deleteDraft(id)
    refresh()
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-[32px] shadow-soft border border-white/60 p-6 sm:p-8 animate-fade-in-up min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-soft-black tracking-tight">草稿箱</h1>
          <p className="text-sm text-gray-500 mt-1">在这里继续未完成的 POS 记录</p>
        </div>
        <Button onClick={() => navigate('/app/add-pos')} variant="outline">
          新建草稿
        </Button>
      </div>

      {drafts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 gap-3">
          <Inbox className="w-10 h-10 text-gray-400" />
          <p>暂无草稿，去地图上选择位置并保存草稿吧。</p>
          <Button onClick={() => navigate('/app/add-pos')}>立即添加</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="p-4 rounded-2xl border border-gray-100 bg-cream hover:border-accent-yellow transition-colors shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-soft-black">{draft.title || '未命名草稿'}</h3>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(draft.savedAt).toLocaleString()}</span>
                  </div>
                  {draft.data?.formData && (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent-yellow" />
                      <span className="line-clamp-1">
                        {draft.data.formData.address ||
                          `${draft.data.formData.latitude?.toFixed(4)}, ${draft.data.formData.longitude?.toFixed(4)}`}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(draft.id)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="删除草稿"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Button className="flex-1" onClick={() => navigate(`/app/add-pos?draftId=${draft.id}`)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  继续填写
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Drafts
