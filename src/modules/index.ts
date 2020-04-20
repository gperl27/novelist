import {combineReducers} from "redux";
import {entitiesReducer} from "./entities";
import {contentReducer} from "./content";

export const rootReducer = combineReducers({
    entities: entitiesReducer,
    content: contentReducer
})

export type RootState = ReturnType<typeof rootReducer>