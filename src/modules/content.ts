import {AppThunk, RootState} from "./index";
import {AppTypes, Entity, PersistenceSchema} from "./entities";
import {CombinedState, Dispatch} from "redux";
import {db} from "../index";

export interface Content extends PersistenceSchema {
    name: string
    text: string
}

interface ContentState {
    selectedContentId?: string
    content: Content[]
}

export enum ContentTypes {
    SetContentStore = 'SET_CONTENT_STORE',
    SetContent = 'SET_CONTENT',
    SelectContent = 'SELECT_CONTENT',
    UpdateContent = 'UPDATE_CONTENT',
    FindAndReplace = 'FIND_AND_REPLACE'
}

interface SetContentStore {
    type: ContentTypes.SetContentStore,
    payload: ContentState
}

interface SetContent {
    type: ContentTypes.SetContent
    payload: Content[]
}

interface SelectContent {
    type: ContentTypes.SelectContent
    payload: string
}

interface UpdateContent {
    type: ContentTypes.UpdateContent
    payload: Content
}

interface FindAndReplace {
    type: ContentTypes.FindAndReplace
    payload: [string, string]
}

type ContentActionTypes = SetContent | SelectContent | UpdateContent | FindAndReplace | SetContentStore

export const addContent = (content?: Content): AppThunk => async (dispatch,) => {
    dispatch(setContent([]))
}

export function setContentStore(store: ContentState): ContentActionTypes {
    return {
        type: ContentTypes.SetContentStore,
        payload: store
    }
}

export function setContent(content: Content[]): ContentActionTypes {
    return {
        type: ContentTypes.SetContent,
        payload: content
    }
}

export function selectContent(contentId: string): ContentActionTypes {
    return {
        type: ContentTypes.SelectContent,
        payload: contentId
    }
}

export const updateContent = (content: Content) => async (dispatch: Dispatch) => {
    await db.put(content)
    dispatch({type: AppTypes.PersistenceSideEffect})
}

export const findAndReplace = (findAndReplaceTuple: [string, string]) => async (dispatch: Dispatch, getState: () => CombinedState<RootState>) => {
    const [find, replace] = findAndReplaceTuple
    const findAll = new RegExp(find, 'g')

    const content = getState().content.content.map(cont => {
        return {
            ...cont,
            name: cont.name.replace(findAll, replace),
            text: cont.text.replace(findAll, replace)
        }
    })
    await db.bulkDocs(content)
    dispatch({type: AppTypes.PersistenceSideEffect})
}

export const contentFixture = [
    {
        _id: '100',
        type: 'content',
        name: 'Chapter 1',
        text: 'It was the best of times, it was the worst of times'
    },
    {
        _id: '101',
        type: 'content',
        name: 'Chapter 2',
        text: 'So it goes...'
    }
]

const initialState: ContentState = {
    selectedContentId: '100',
    content: []
}

export function contentReducer(state = initialState, action: ContentActionTypes) {
    switch (action.type) {
        case ContentTypes.SetContent:
            return {
                ...state,
                content: action.payload
            }
        case ContentTypes.SelectContent:
            return {
                ...state,
                selectedContentId: action.payload
            }
        case ContentTypes.FindAndReplace: {
            const [find, replace] = action.payload
            const findAll = new RegExp(find, 'g')

            const content = state.content.map(cont => {
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
        case ContentTypes.SetContentStore:
            return {
                ...state,
                content: action.payload.content
            }
        default:
            return state
    }
}
