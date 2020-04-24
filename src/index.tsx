import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {Action, applyMiddleware, createStore, Dispatch, Middleware, MiddlewareAPI, StoreEnhancer} from "redux";
import {rootReducer} from "./modules";
import {Provider} from 'react-redux'
import Pouch from 'pouchdb';
import thunk from "redux-thunk";
import {AppTypes, Entity, entityDocuments, setEntityStore} from "./modules/entities";
import {Content, setContentStore} from "./modules/content";

export const db = new Pouch('novelist');

interface DbEntity extends Omit<Entity, 'entities'> {
    entities: string[]
}

export function flatToHierarchy(flat: DbEntity[], parentId?: string, index = {} as { [key: string]: DbEntity }): Entity[] {
    const roots: Entity[] = []

    if (Object.entries(index).length === 0) {
        flat.forEach(function (item) {
            index[item._id] = item
        })
    }

    flat.forEach(node => {
        if (!node.entity || node.entity === parentId) {
            const nestedEntityMap = node.entities.map(id => index[id])
            const filledNodes = {
                ...node,
                entities: flatToHierarchy(nestedEntityMap, node._id, index)
            }
            roots.push(filledNodes)
        }
    })

    return roots
}

export const pouchWrite: Middleware = api => next => action => {
    if (action.type === AppTypes.PersistenceSideEffect) {
        db.bulkDocs(entityDocuments)
            .catch(e => console.log(e))
            .finally(() => {
                db.allDocs({include_docs: true}).then(docs => {
                    const entities = docs.rows.filter(row => {
                        // @ts-ignore
                        return row.doc.type === 'entity'
                    })
                        .map(row => row.doc)

                    const a = store.getState
                    // @ts-ignore
                    const content: Content[] = docs.rows.filter(row => row.doc.type === 'content').map(row => row.doc)

                    store.dispatch(setEntityStore({
                        // @ts-ignore
                        entities: flatToHierarchy(entities)
                    }))
                    store.dispatch(setContentStore({
                        // @ts-ignore
                        content
                    }))
                })
            })
    }

    return next(action);
};

const store = createStore(rootReducer, applyMiddleware(thunk, pouchWrite))

ReactDOM.render(
    <Provider store={store}>
        <App/>
    </Provider>,
    document.getElementById('root')
)
;

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
