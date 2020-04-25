import * as React from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../modules";
import {
    addEntity,
    Descriptor,
    deselectEntities,
    Entity,
    selectEntities,
    Traits,
    updateEntity
} from "../modules/entities";
import {findAndReplace} from "../modules/content";
import {Card, Collapse, Button, Tag, Input, Tree, Divider} from "antd";
import {ChangeEvent, ComponentProps, createElement, useState} from "react";
import {
    EditOutlined,
    CheckOutlined,
    PlusOutlined,
    CloseCircleOutlined,
    CloseOutlined
} from '@ant-design/icons';

function transformEntitiesToTreedData(entities: Entity[]): ComponentProps<typeof Tree> ['treeData'] {
    return entities.map(entity => {
        return {
            key: entity._id,
            title: entity.name,
            children: transformEntitiesToTreedData(entity.entities)
        }
    })
}

export function EntityEditor() {
    const dispatch = useDispatch()
    const {selectedEntities, entities, selectedEntityIds} = useSelector((state: RootState) => {
        const {entities, selectedEntityIds, entitiesIndex} = state.entities
        const selectedEntities = selectedEntityIds.map(id => {
            const entityFromIndex = entitiesIndex[id]
            return {
                ...entityFromIndex,
                entities: entityFromIndex.entities.map(id => entitiesIndex[id])
            }
        })

        return {
            entities,
            selectedEntities,
            selectedEntityIds
        }
    })

    return (
        <>
            <Tree
                showLine={true}
                showIcon={true}
                treeData={transformEntitiesToTreedData(entities)}
                multiple={true}
                selectable={true}
                selectedKeys={selectedEntityIds}
                onSelect={
                    (keys) => {
                        dispatch(selectEntities(keys as string[]))
                    }
                }
            />
            {
                selectedEntities.map(entity => {
                    return (
                        <div key={entity._id} style={{marginTop: '0.5rem', marginBottom: '0.5rem'}}>
                            <EditEntity entity={entity as unknown as Entity}/>
                        </div>
                    )
                })
            }
        </>
    )
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
    isEditing?: boolean
    elementType?: string
    value?: string
    onSave?: (value: string) => void
}

export function Editable(props: EditableProps) {
    const [showEdit, setShowEdit] = useState(false)
    const [isEditing, setIsEditing] = useState(props.isEditing ?? false)
    const [value, setValue] = useState(props.value ?? '')

    function onSave(e: React.MouseEvent) {
        e.stopPropagation()
        setIsEditing(false)

        props.onSave && props.onSave(value)
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
                <Button shape={'circle'} size={"small"} icon={<CheckOutlined/>} onClick={onSave}/>
            </div>
        )
    }

    return (
        <div onMouseOver={() => setShowEdit(true)} onMouseLeave={() => setShowEdit(false)} style={{display: 'flex'}}>
            {createElement(props.elementType ?? 'span', null, value)}
            {showEdit &&
            <Button shape={'circle'} size={"small"} icon={<EditOutlined/>} onClick={onEdit}/>}
        </div>
    )

}

function EditEntity(props: EditEntityProps) {
    const {selectedEntityIds} = useSelector((state: RootState) => state.entities)
    const dispatch = useDispatch()
    const {entity} = props

    function onSaveEntity(value: string) {
        dispatch(updateEntity({
            ...entity,
            isEditing: false,
            name: value
        }))

        if (value.length > 0) {
            dispatch(findAndReplace([entity.name, value]))
        }
    }

    const onClickEntity = (id: string) => () => {
        if (selectedEntityIds.indexOf(id) === -1) {
            const ids = selectedEntityIds.concat(id)

            dispatch(selectEntities(ids))
        }
    }

    const onClickAddEntity = (entity: Entity) => () => {
        dispatch(addEntity(entity))
    }

    function onDeselectEntity() {
        dispatch(deselectEntities([entity._id]))
    }

    return (
        <Card
            title={<Editable isEditing={entity.isEditing} onSave={onSaveEntity} value={entity.name}/>}
            extra={<div>
                <Button shape={'circle'} onClick={onDeselectEntity} icon={<CloseOutlined/>}/>
            </div>}
        >
            <Description description={entity.descriptor}/>
            <Divider/>
            {entity.entities.length > 0 && <h4>Entities:</h4>}
            {
                entity.entities.map(entity => {
                    return (
                        <div key={entity._id}>
                            <h5 onClick={onClickEntity(entity._id)} key={entity._id}>{entity.name}</h5>
                        </div>
                    )
                })
            }
            <Button onClick={onClickAddEntity(entity)} type={'dashed'}>
                <PlusOutlined/> Add Entity
            </Button>
        </Card>
    )
}