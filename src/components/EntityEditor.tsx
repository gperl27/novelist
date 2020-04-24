import * as React from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../modules";
import {Descriptor, Entity, selectEntity, Traits, updateEntity} from "../modules/entities";
import {findAndReplace} from "../modules/content";
import {Card, Collapse, Button, Tag, Input} from "antd";
import {ChangeEvent, useState} from "react";
import {
    EditOutlined,
    CheckOutlined
} from '@ant-design/icons';

function findEntity(id: string, entities: Entity[]): Entity | undefined {
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i]

        if (entity._id === id) {
            return entity
        }

        if (entity.entities.length > 0) {
            const nestedEntity = findEntity(id, entity.entities)

            if (nestedEntity?._id === id) {
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
            <div>
                {description.map(trait => {
                    return (
                        <Tag key={trait}>{trait}</Tag>
                    )
                })}
            </div>
        )
    }

    if (isDescription(description)) {
        return <div>{description}</div>
    }

    return null
}

interface EditableProps {
    value?: string
    onSave?: (value: string) => void
}

function Editable(props: EditableProps) {
    const [showEdit, setShowEdit] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [value, setValue] = useState(props.value || '')

    function onSave(e: React.MouseEvent) {
        e.stopPropagation()
        props.onSave && props.onSave(value)
        setIsEditing(false)
    }

    function onEdit(e: React.MouseEvent) {
        e.stopPropagation()
        setIsEditing(true)
    }

    if (isEditing) {
        return (
            <div style={{display: 'flex'}}>
                <Input onClick={e => e.stopPropagation()} value={value}
                       onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
                       placeholder="Property here"/>
                <Button type={'link'} shape={'circle'} size={"small"} icon={<CheckOutlined/>} onClick={onSave}/>
            </div>
        )
    }

    return (
        <div onMouseOver={() => setShowEdit(true)} onMouseLeave={() => setShowEdit(false)} style={{display: 'flex'}}>
            <h3>{value}</h3>
            {showEdit &&
            <Button type={'link'} shape={'circle'} size={"small"} icon={<EditOutlined/>} onClick={onEdit}/>}
        </div>
    )

}

function EditEntity(props: EditEntityProps) {
    const {entity} = props
    const dispatch = useDispatch()

    function onSaveEntity(value: string) {
        dispatch(updateEntity({
            ...entity,
            name: value
        }))

        if (value.length > 0) {
            dispatch(findAndReplace([entity.name, value]))
        }
    }

    return (
        <Collapse bordered={false}>
            <Collapse.Panel
                key={entity._id}
                header={<Editable value={entity.name} onSave={onSaveEntity}/>}
            >
                <Description description={entity.descriptor}/>
                {
                    entity.entities.map((entity, index) => {
                        return (
                            <EditEntity key={entity._id} entity={entity}/>
                        )
                    })
                }
            </Collapse.Panel>
        </Collapse>
    )
}