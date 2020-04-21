export enum EntityTypes {
    SelectEntity = 'SELECT_ENTITY',
    UpdateEntity = 'UPDATE_ENTITY'
}

interface SelectEntity {
    type: EntityTypes.SelectEntity
    payload: number
}

interface UpdateEntity {
    type: EntityTypes.UpdateEntity
    payload: Entity
}

type EntityActionTypes = SelectEntity | UpdateEntity

export function selectEntity(entityId: number): EntityActionTypes {
    return {
        type: EntityTypes.SelectEntity,
        payload: entityId
    }
}

export function updateEntity(entity: Entity): EntityActionTypes {
    return {
        type: EntityTypes.UpdateEntity,
        payload: entity
    }
}

export type Traits = string[]
export type Description = string
export type Descriptor = Traits | Description

export interface Entity {
    id: number
    name: string
    descriptor?: Descriptor
    entities: Entity[]
    shouldAutoComplete: boolean
    shouldDeepLink: boolean
}

interface EntityState {
    entities: Entity[]
    selectedEntityId?: number
}

const initialState: EntityState = {
    entities: [
        {
            id: 1,
            name: 'Characters',
            entities: [
                {
                    id: 3,
                    name: 'Kubo',
                    entities: [
                        {
                            id: 4,
                            name: 'Traits',
                            descriptor: ['Clever', 'Observant', 'Soft-spoken'],
                            entities: [],
                            shouldAutoComplete: true,
                            shouldDeepLink: true,
                        },
                        {
                            id: 5,
                            name: 'Description',
                            descriptor: 'A sophisticated young man with a knack for playing ping pong',
                            entities: [],
                            shouldAutoComplete: true,
                            shouldDeepLink: true,
                        }
                    ],
                    shouldAutoComplete: true,
                    shouldDeepLink: true,
                },
                {
                    id: 6,
                    name: 'Knidas',
                    entities: [
                        {
                            id: 7,
                            name: 'Traits',
                            descriptor: ['Clever', 'Observant', 'Soft-spoken'],
                            entities: [],
                            shouldAutoComplete: true,
                            shouldDeepLink: true,
                        },
                        {
                            id: 8,
                            name: 'Description',
                            descriptor: 'A sophisticated young man with a knack for playing ping pong',
                            entities: [],
                            shouldAutoComplete: true,
                            shouldDeepLink: true,
                        }
                    ],
                    shouldAutoComplete: true,
                    shouldDeepLink: true,
                },
            ],
            shouldAutoComplete: true,
            shouldDeepLink: true,
        },
        {
            id: 2,
            name: 'Plot Points',
            entities: [{
                id: 9,
                name: 'Beginning',
                descriptor: 'Kubo finds the ping pong world',
                entities: [],
                shouldAutoComplete: false,
                shouldDeepLink: true,
            }],
            shouldAutoComplete: true,
            shouldDeepLink: true,
        }
    ]
}

function findAndReplaceEntity(entities: Entity[], replacement: Entity): Entity[] {
    return entities.map(entity => {
        if (entity.id === replacement.id) {
            return replacement
        }

        if (entity.entities.length > 0) {
            return {
                ...entity,
                entities: findAndReplaceEntity(entity.entities, replacement)
            }
        }

        return entity
    })
}

export function entitiesReducer(state = initialState, action: EntityActionTypes) {
    switch (action.type) {
        case EntityTypes.SelectEntity:
            return {
                ...state,
                selectedEntityId: action.payload
            }
        case EntityTypes.UpdateEntity:
            const newEntities: Entity[] = findAndReplaceEntity(state.entities, action.payload)

            return {
                ...state,
                entities: newEntities
            }
        default:
            return state
    }
}