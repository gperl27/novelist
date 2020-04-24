import {Dispatch} from "redux";
import {db} from "../index";

export enum EntityTypes {
    SetEntityStore = 'SET_ENTITY_STORE',
    SelectEntity = 'SELECT_ENTITY',
    UpdateEntity = 'UPDATE_ENTITY'
}

export enum AppTypes {
    PersistenceSideEffect = 'PERSISTENCE_SIDE_EFFECT'
}

interface SelectEntity {
    type: EntityTypes.SelectEntity
    payload: string
}

interface UpdateEntity {
    type: EntityTypes.UpdateEntity
    payload: Entity
}

interface SetEntityStore {
    type: EntityTypes.SetEntityStore,
    payload: EntityState
}

type EntityActionTypes = SelectEntity | UpdateEntity | SetEntityStore

export function selectEntity(entityId: string): EntityActionTypes {
    return {
        type: EntityTypes.SelectEntity,
        payload: entityId
    }
}

export const updateEntity = (entity: Entity) => async (dispatch: Dispatch) => {
    const dbEntity = {
        ...entity,
        entities: entity.entities.map(entity => entity._id)
    }

    await db.put(dbEntity)
    dispatch({type: AppTypes.PersistenceSideEffect})
}

export function setEntityStore(store: EntityState): EntityActionTypes {
    return {
        type: EntityTypes.SetEntityStore,
        payload: store
    }
}

export type Traits = string[]
export type Description = string
export type Descriptor = Traits | Description

export type PersistenceSchema = PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & {
    type: string
}

export interface Entity extends PersistenceSchema {
    name: string
    descriptor?: Descriptor
    entity?: string
    entities: Entity[]
    shouldAutoComplete: boolean
    shouldDeepLink: boolean
}

export interface EntityState {
    entities: Entity[]
    selectedEntityId?: string
}

export const entityDocuments = [
    {
        _id: '1',
        type: 'entity',
        name: "Characters",
        entities: ['2'],
        shouldAutoComplete: false,
        shouldDeepLink: false,
    },
    {
        _id: '2',
        type: 'entity',
        name: "Kubo",
        entity: '1',
        entities: [],
        shouldAutoComplete: true,
        shouldDeepLink: false,
    },
    {
        _id: '3',
        type: 'entity',
        name: "Plot",
        entities: ['4'],
        shouldAutoComplete: false,
        shouldDeepLink: false,
    },
    {
        _id: '4',
        type: 'entity',
        entity: '3',
        entities: [],
        name: "The Beginning",
        shouldAutoComplete: false,
        shouldDeepLink: false,
    }
]

const initialState: EntityState = {
    entities: []
}

export function entitiesReducer(state = initialState, action: EntityActionTypes) {
    switch (action.type) {
        case EntityTypes.SelectEntity:
            return {
                ...state,
                selectedEntityId: action.payload
            }
        case EntityTypes.SetEntityStore: {
            return {
                ...state,
                entities: action.payload.entities
            }
        }
        default:
            return state
    }
}