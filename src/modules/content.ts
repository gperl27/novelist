
export interface Content {
    name: string
    text: string
}

interface ContentState {
    content: Content[]
}

const initialState: ContentState = {
    content: [
        {
            name: 'Chapter 1',
            text: 'It was the best of times, it was the worst of times'
        }
    ]
}

export function contentReducer(state = initialState, action: any) {
    return state
}
