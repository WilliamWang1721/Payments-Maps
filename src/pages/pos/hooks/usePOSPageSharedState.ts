import { useMapStore, type MapState } from '@/stores/useMapStore'

type AddPOSSharedState = Pick<MapState, 'addPOSMachine' | 'deletePOSMachine'>
type EditPOSSharedState = Pick<MapState, 'posMachines' | 'updatePOSMachine' | 'deletePOSMachine'>
type POSDetailSharedState = Pick<MapState, 'posMachines' | 'deletePOSMachine' | 'selectPOSMachine'>

export const useAddPOSSharedState = (): AddPOSSharedState => {
  const addPOSMachine = useMapStore((state) => state.addPOSMachine)
  const deletePOSMachine = useMapStore((state) => state.deletePOSMachine)
  return {
    addPOSMachine,
    deletePOSMachine,
  }
}

export const useEditPOSSharedState = (): EditPOSSharedState => {
  const posMachines = useMapStore((state) => state.posMachines)
  const updatePOSMachine = useMapStore((state) => state.updatePOSMachine)
  const deletePOSMachine = useMapStore((state) => state.deletePOSMachine)
  return {
    posMachines,
    updatePOSMachine,
    deletePOSMachine,
  }
}

export const usePOSDetailSharedState = (): POSDetailSharedState => {
  const posMachines = useMapStore((state) => state.posMachines)
  const deletePOSMachine = useMapStore((state) => state.deletePOSMachine)
  const selectPOSMachine = useMapStore((state) => state.selectPOSMachine)
  return {
    posMachines,
    deletePOSMachine,
    selectPOSMachine,
  }
}
