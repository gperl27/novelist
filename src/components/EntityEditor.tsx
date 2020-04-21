import * as React from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../modules";
import {Descriptor, Entity, selectEntity, Traits, updateEntity} from "../modules/entities";
import {findAndReplace} from "../modules/content";

function findEntity(id: number, entities: Entity[]): Entity | undefined {
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i]

        if (entity.id === id) {
            return entity
        }

        if (entity.entities.length > 0) {
            const nestedEntity = findEntity(id, entity.entities)

            if (nestedEntity?.id === id) {
                return nestedEntity
            }
        }
    }
}

export function EntityEditor() {
    const {selectedEntity} = useSelector((state: RootState): { selectedEntity?: Entity } => {
        const {entities, selectedEntityId} = state.entities
        const selectedEntity = selectedEntityId ? findEntity(selectedEntityId, entities) : undefined

        return {
            selectedEntity
        }
    })

    if (!selectedEntity) {
        return null
    }

    return <EditEntity entity={selectedEntity}/>
}

interface EditEntityProps {
    entity: Entity
}


function getFlatEntityMap(entities: Entity[]): Entity[] {
    return entities.reduce((acc, current) => {
        return acc.concat(current, getFlatEntityMap(current.entities))
    }, [] as Entity[])
}

function areTraits(descriptor: any): descriptor is Traits {
    return Array.isArray(descriptor)
}

function isDescription(descriptor: any): descriptor is Traits {
    return typeof descriptor == 'string'
}

interface DescriptionProps {
    description?: Descriptor
}

function Description(props: DescriptionProps) {
    const {description} = props

    if (areTraits(description)) {
        return (
            <ul>
                {description.map(trait => {
                    return (
                        <li key={trait}>{trait}</li>
                    )
                })}
            </ul>
        )
    }

    if (isDescription(description)) {
        return <div>{description}</div>
    }

    return null
}

function EditEntity(props: EditEntityProps) {
    const {entity} = props
    const dispatch = useDispatch()
    const flatEntityMap = getFlatEntityMap(entity.entities)

    return (
        <div>
            <h2>{entity.name}</h2>
            <h3>{entity.descriptor}</h3>
            <button onClick={() => console.log('edit')}>Edit</button>
            {
                flatEntityMap.map((entity, index) => {
                    return (
                        <div key={entity.id}
                             style={{padding: '1rem', margin: '1rem', border: '1px solid black'}}>
                            <h4>{entity.name}</h4>
                            <input value={entity.name} onChange={(e) => {
                                dispatch(updateEntity({
                                    ...entity,
                                    name: e.target.value
                                }))
                                dispatch(findAndReplace([entity.name, e.target.value]))
                            }}/>
                            <Description description={entity.descriptor}/>
                            <button onClick={() => dispatch(selectEntity(entity.id))}>Select</button>
                        </div>
                    )
                })
            }
        </div>
    )
}