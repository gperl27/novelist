import * as React from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../modules";
import {
    addEntity, Description,
    Descriptor,
    deselectEntities,
    Entity,
    selectEntities,
    Traits,
    updateEntity
} from "../modules/entities";
import {findAndReplace} from "../modules/content";
import {Card, Collapse, Button, Tag, Input, Tree, Divider, Form, Switch, Select} from "antd";
import {ChangeEvent, ComponentProps, createElement, useState} from "react";
import {
    EditOutlined,
    CheckOutlined,
    PlusOutlined,
    CloseCircleOutlined,
    CloseOutlined,
    EllipsisOutlined,
    DeleteOutlined
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
    return Array.isArray(descriptor.traits)
}

function isDescription(descriptor: any): descriptor is Description {
    return descriptor.description && typeof descriptor.description === 'string'
}

interface DescriptionProps {
    isEditing: boolean
    description: Descriptor
}

function DescriptionForm(props: DescriptionProps) {
    const {description, isEditing} = props
    let node

    if (areTraits(description)) {
        node = isEditing ? (
                <div>
                    {description.traits.map(trait => {
                        return (
                            <Tag key={trait}>{trait}</Tag>
                        )
                    })}
                </div>
            )
            :
            (<div>isEditing</div>)
    }

    if (isDescription(description)) {
        node = isEditing ? <div>isEditing</div> : <div>{description}</div>
    }

    return (
        <div>
            {isEditing ? <div>isEditing</div> : <h4>{description.name}</h4>}
            {node}
        </div>
    )
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

type DescriptorType = 'traits' | 'description'

interface FormDescriptor {
    id: string | number
    name: string,
    type: DescriptorType,
    traits?: string[]
    description?: string
}

function transformDescriptors(descriptors: Descriptor[]): FormDescriptor[] {
    return descriptors.map((descriptor, index) => {
        return {
            id: index,
            type: areTraits(descriptor) ? 'traits' : 'description',
            name: descriptor.name
        }
    })
}

function EditEntity(props: EditEntityProps) {
    const {selectedEntityIds} = useSelector((state: RootState) => state.entities)
    const dispatch = useDispatch()
    const {entity} = props
    const [isEditing, setIsEditing] = useState(props.entity.isEditing ?? false)
    const [descriptors, setDescriptors] = useState(transformDescriptors(entity.descriptors) || [])
    const [form] = Form.useForm()

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

    const onClickEditEntity = (entity: Entity) => () => {
        setIsEditing(true)

        dispatch(updateEntity({
            ...entity,
            isEditing: true,
        }))
    }

    const onClickAddEntity = (entity: Entity) => () => {
        dispatch(addEntity(entity))
    }

    function onDeselectEntity() {
        dispatch(deselectEntities([entity._id]))
    }

    const onSelectDescriptorType = (formName: string, descriptor: FormDescriptor) => (type: DescriptorType) => {
        const descriptionIndex = descriptors.findIndex(d => d.id === descriptor.id)

        if (descriptionIndex === -1) {
            return
        }

        const descriptorsMutable = [...descriptors]
        descriptorsMutable[descriptionIndex] = {
            ...descriptor,
            type
        }

        setDescriptors(descriptorsMutable)
    }

    return (
        <Card
            actions={[
                <PlusOutlined onClick={onClickAddEntity(entity)}/>,
                <EditOutlined onClick={onClickEditEntity(entity)}/>,
                <DeleteOutlined onClick={() => console.log('delete')}/>,
                <EllipsisOutlined onClick={() => console.log('ellipsis')}/>,
            ]}
            title={<h3>{entity.name}</h3>}
            extra={<div>
                <Button shape={'circle'} onClick={onDeselectEntity} icon={<CloseOutlined/>}/>
            </div>}
        >
            {/*{*/}
            {/*    entity.descriptors.map((descriptor, index) => {*/}
            {/*        return <DescriptionForm isEditing={isEditing} key={index} description={descriptor}/>*/}
            {/*    })*/}
            {/*}*/}
            {
                isEditing && (
                    <Form form={form} onFinish={console.log} initialValues={{
                        name: props.entity.name,
                        // descriptors: props.entity.descriptors
                        // shouldAutoComplete: props.entity.shouldAutoComplete,
                        // shouldDeepLink: props.entity.shouldDeepLink
                    }}>
                        <Form.Item label={'Entity Name'} name={'name'}>
                            <Input placeholder={"Entity name"} onChange={console.log}/>
                        </Form.Item>
                        <Form.Item name={'shouldAutoComplete'} label="Enable Word Completion">
                            <Switch defaultChecked={props.entity.shouldAutoComplete} size={'small'}/>
                        </Form.Item>
                        <Form.Item name={'shouldDeepLink'} label="Enable Deep Linking">
                            <Switch defaultChecked={props.entity.shouldDeepLink} size={'small'}/>
                        </Form.Item>
                        {
                            descriptors.map((descriptor, index) => {
                                const key = `descriptor-${descriptor.name}-${index}-${entity._id}`

                                return (
                                    <div key={key}>
                                        <h5>{descriptor.name}</h5>
                                        <Form.Item
                                            label={'Name'}
                                            name={`${key}-name`}
                                        >
                                            <Input defaultValue={descriptor.name}/>
                                        </Form.Item>
                                        <Form.Item name={`${key}-type`} label={'Type'}>
                                            <Select onChange={onSelectDescriptorType(key, descriptor)}
                                                    defaultValue={descriptor.type}>
                                                <Select.Option value="description">Description</Select.Option>
                                                <Select.Option value="traits">Traits</Select.Option>
                                            </Select>
                                        </Form.Item>
                                        {
                                            descriptor.type === 'traits' ?
                                                <div>
                                                    {
                                                        descriptor.traits && descriptor.traits.map((trait, index) => {
                                                            return <Tag key={index}>{trait}</Tag>
                                                        })}
                                                    <Tag className="site-tag-plus" onClick={console.log}>
                                                        <PlusOutlined/> New Trait
                                                    </Tag>
                                                </div>
                                                :
                                                <Form.Item
                                                    label={'Description'}
                                                    name={`${key}-description`}
                                                >
                                                    <Input/>
                                                </Form.Item>
                                        }
                                    </div>
                                )
                            })
                        }
                        <Button type={'dashed'}
                                onClick={() => setDescriptors(d => d.concat({
                                    id: descriptors.length + 1,
                                    name: 'Untitled',
                                    type: 'description',
                                    description: ''
                                }))}>+ Add
                            Descriptor</Button>
                        <Form.Item>
                            <Button htmlType={'submit'}>Save</Button>
                        </Form.Item>
                        <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                    </Form>
                )
            }

            {entity.entities.length > 0 && (
                <>
                    <Divider/>
                    <h4>Entities:</h4>
                </>
            )}
            {
                entity.entities.map(entity => {
                    return (
                        <div key={entity._id}>
                            <h5 onClick={onClickEntity(entity._id)} key={entity._id}>{entity.name}</h5>
                        </div>
                    )
                })
            }
        </Card>
    )
}

