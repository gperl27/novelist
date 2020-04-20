type Traits = string[]
type Description = string

type Descriptor = Traits | Description

export interface Entity {
    name: string
    descriptor?: Descriptor
    entities: Entity[]
    shouldAutoComplete: boolean
    shouldDeepLink: boolean
}

interface EntityState {
    entities: Entity[]
}

const initialState: EntityState = {
    entities: [
        {
            name: 'Characters',
            entities: [
                {
                    name: 'Kubo',
                    entities: [
                        {
                            name: 'Traits',
                            descriptor: ['Clever', 'Observant', 'Soft-spoken'],
                            entities: [],
                            shouldAutoComplete: true,
                            shouldDeepLink: true,
                        },
                        {
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
                    name: 'Knidas',
                    entities: [
                        {
                            name: 'Traits',
                            descriptor: ['Clever', 'Observant', 'Soft-spoken'],
                            entities: [],
                            shouldAutoComplete: true,
                            shouldDeepLink: true,
                        },
                        {
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
            name: 'Plot Points',
            entities: [{
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

export function entitiesReducer(state = initialState, action: any) {
    return state
}