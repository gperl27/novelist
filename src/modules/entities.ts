import {db, DbEntity} from "../index";
import {v4 as uuidv4} from 'uuid';
import {AppThunk} from "./index";
import {updateStores} from "./app";

export enum EntityTypes {
    AddEntity = 'ADD_ENTITY',
    SetEntityStore = 'SET_ENTITY_STORE',
    SelectEntities = 'SELECT_ENTITIES',
    UpdateEntity = 'UPDATE_ENTITY'
}

interface SelectEntities {
    type: EntityTypes.SelectEntities
    payload: string[]
}

interface UpdateEntity {
    type: EntityTypes.UpdateEntity
    payload: Entity
}

interface SetEntityStore {
    type: EntityTypes.SetEntityStore,
    payload: Partial<EntityState>
}

interface AddEntity {
    type: EntityTypes.AddEntity,
    payload: Entity
}

type EntityActionTypes = SelectEntities | UpdateEntity | SetEntityStore | AddEntity

export function selectEntities(entityIds: string[]): EntityActionTypes {
    return {
        type: EntityTypes.SelectEntities,
        payload: entityIds
    }
}

export const deselectEntities = (entityIds: string[]): AppThunk => async (dispatch, getState) => {
    const currentlySelectedIds = getState().entities.selectedEntityIds
    const idsAfterDeselecting = currentlySelectedIds.filter(id => entityIds.indexOf(id) === -1)

    dispatch({
        type: EntityTypes.SelectEntities,
        payload: idsAfterDeselecting
    })
}

export const updateEntity = (entity: Entity): AppThunk => async (dispatch) => {
    const dbEntity = {
        ...entity,
        entities: entity.entities.map(entity => entity._id)
    }

    await db.put(dbEntity)
    await dispatch(updateStores())
}

export const addEntity = (parentEntity: Entity): AppThunk => async (
    dispatch, getState
) => {
    const _id = uuidv4()
    const dbEntity: Omit<Entity, '_rev'> = {
        _id,
        descriptors: [],
        name: 'Untitled',
        entity: parentEntity._id,
        type: 'entity',
        entities: [],
        isEditing: true,
        shouldAutoComplete: false,
        shouldDeepLink: false,
    }

    await db.put(dbEntity)
    await dispatch(updateEntity({
        ...parentEntity,
        entities: parentEntity.entities.concat(dbEntity as Entity)
    }))
    const ids = getState().entities.selectedEntityIds.concat(_id)
    dispatch(selectEntities(ids))
}

export function setEntityStore(store: Partial<EntityState>): EntityActionTypes {
    return {
        type: EntityTypes.SetEntityStore,
        payload: store
    }
}

export interface DescriptorBase {
    name: string
}
export type Traits = DescriptorBase & { traits: string[] }
export type Description = DescriptorBase & { description: string }
export type Descriptor = Traits | Description

export type PersistenceSchema = PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & {
    type: string
}

export interface Entity extends PersistenceSchema {
    name: string
    descriptors: Descriptor[]
    entity?: string
    entities: Entity[]
    shouldAutoComplete: boolean
    shouldDeepLink: boolean
    isEditing: boolean
}

export interface EntityState {
    entitiesIndex: { [key: string]: DbEntity }
    entities: Entity[]
    selectedEntityIds: string[]
}

export const entityDocuments: Omit<DbEntity, '_rev'>[] = [
    {
        _id: '1',
        descriptors: [],
        type: 'entity',
        name: "Characters",
        entities: ['2'],
        shouldAutoComplete: false,
        shouldDeepLink: false,
        isEditing: false
    },
    {
        _id: '2',
        descriptors: [],
        type: 'entity',
        name: "Kubo",
        entity: '1',
        entities: [],
        shouldAutoComplete: true,
        shouldDeepLink: false,
        isEditing: false
    },
    {
        _id: '3',
        descriptors: [],
        type: 'entity',
        name: "Plot",
        entities: ['4'],
        shouldAutoComplete: false,
        shouldDeepLink: false,
        isEditing: false
    },
    {
        _id: '4',
        descriptors: [],
        type: 'entity',
        entity: '3',
        entities: [],
        name: "The Beginning",
        shouldAutoComplete: false,
        shouldDeepLink: false,
        isEditing: false
    }
]

const initialState: EntityState = {
    entitiesIndex: {},
    selectedEntityIds: [],
    entities: [],
}

export function entitiesReducer(state = initialState, action: EntityActionTypes) {
    switch (action.type) {
        case EntityTypes.SelectEntities:
            return {
                ...state,
                selectedEntityIds: action.payload
            }
        case EntityTypes.SetEntityStore: {
            return {
                ...state,
                ...action.payload
            }
        }
        default:
            return state
    }
}