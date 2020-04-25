import {setEntityStore} from "./entities";
import {AppThunk} from "./index";
import {db, DbEntity, flatToHierarchy} from "../index";
import {Content, setContentStore} from "./content";


export const updateStores = (): AppThunk => async (dispatch) => {
    return db.allDocs({include_docs: true}).then(docs => {
        const entities = docs.rows.filter(row => {
            // @ts-ignore
            return row.doc.type === 'entity'
        })
            .map(row => row.doc)

        // @ts-ignore
        const content: Content[] = docs.rows.filter(row => row.doc.type === 'content').map(row => row.doc)


        const entitiesIndex: { [key: string]: DbEntity } = {}
        entities.forEach(function (item) {
            if (item) {
                // @ts-ignore
                entitiesIndex[item._id] = item
            }
        })

        dispatch(setEntityStore({
            // @ts-ignore
            entitiesIndex,
            // @ts-ignore
            entities: flatToHierarchy(entities, null, entitiesIndex)
        }))
        dispatch(setContentStore({
            // @ts-ignore
            content
        }))
    })

}