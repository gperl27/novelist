export interface Content {
    id: number
    name: string
    text: string
}

interface ContentState {
    selectedContentId?: number
    content: Content[]
}

enum ContentTypes {
    SelectContent = 'SELECT_CONTENT',
    UpdateContent = 'UPDATE_CONTENT',
    FindAndReplace = 'FIND_AND_REPLACE'
}

interface SelectContent {
    type: ContentTypes.SelectContent
    payload: number
}

interface UpdateContent {
    type: ContentTypes.UpdateContent
    payload: Content
}

interface FindAndReplace {
    type: ContentTypes.FindAndReplace
    payload: [string, string]
}

type ContentActionTypes = SelectContent | UpdateContent | FindAndReplace

export function selectContent(contentId: number): ContentActionTypes {
    return {
        type: ContentTypes.SelectContent,
        payload: contentId
    }
}

export function updateContent(content: Content): ContentActionTypes {
    return {
        type: ContentTypes.UpdateContent,
        payload: content
    }
}

export function findAndReplace(findAndReplaceTuple: [string, string]): ContentActionTypes {
    return {
        type: ContentTypes.FindAndReplace,
        payload: findAndReplaceTuple
    }
}

const contentFixture = [
    {
        id: 1,
        name: 'Chapter 1',
        text: 'It was the best of times, it was the worst of times'
    },
    {
        id: 2,
        name: 'Chapter 2',
        text: 'So it goes...'
    }
]

const initialState: ContentState = {
    selectedContentId: 1,
    content: contentFixture
}

export function contentReducer(state = initialState, action: ContentActionTypes) {
    switch (action.type) {
        case ContentTypes.SelectContent:
            return {
                ...state,
                selectedContentId: action.payload
            }
        case ContentTypes.UpdateContent: {
            const content = state.content.map(cont => {
                if (cont.id === action.payload.id) {
                    return action.payload
                }

                return cont
            })

            return {
                ...state,
                content
            }
        }
        case ContentTypes.FindAndReplace: {
            const content = state.content.map(cont => {
                const [find, replace] = action.payload
                const findAll = new RegExp(find, 'g')
                return {
                    ...cont,
                    name: cont.name.replace(findAll, replace),
                    text: cont.text.replace(findAll, replace)
                }
            })

            return {
                ...state,
                content
            }
        }
        default:
            return state
    }
}
