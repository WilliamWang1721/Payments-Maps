import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type IssueReportStatus = 'open' | 'resolved'
export type IssueReportItemType = 'pos' | 'card'

export type IssueReport = {
  id: string
  itemType: IssueReportItemType
  itemId: string
  itemLabel: string
  issueType: string
  description: string
  contact?: string
  status: IssueReportStatus
  createdAt: string
  resolvedAt?: string
  reporter?: {
    id?: string
    name?: string
  }
}

type IssueReportState = {
  reports: IssueReport[]
  addReport: (report: Omit<IssueReport, 'id' | 'status' | 'createdAt' | 'resolvedAt'>) => IssueReport
  resolveReport: (reportId: string) => void
}

export const useIssueReportStore = create<IssueReportState>()(
  persist(
    (set) => ({
      reports: [],
      addReport: (report) => {
        const newReport: IssueReport = {
          ...report,
          id: `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          status: 'open',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ reports: [newReport, ...state.reports] }))
        return newReport
      },
      resolveReport: (reportId) => {
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? { ...report, status: 'resolved', resolvedAt: new Date().toISOString() }
              : report
          ),
        }))
      },
    }),
    {
      name: 'issue-report-store',
      version: 1,
    }
  )
)
