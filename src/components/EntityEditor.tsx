import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../modules";
import {
  addEntity,
  Description,
  Descriptor,
  deselectEntities,
  Entity,
  selectEntities,
  Traits,
  updateEntity,
} from "../modules/entities";
import {
  Card,
  Button,
  Tag,
  Input,
  Tree,
  Divider,
  Form,
  Switch,
  Select,
} from "antd";
import {
  ChangeEvent,
  ComponentProps,
  createElement,
  useEffect,
  useState,
} from "react";
import {
  EditOutlined,
  CheckOutlined,
  PlusOutlined,
  EllipsisOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { MinusOutlined } from "@ant-design/icons/lib";

function transformEntitiesToTreedData(
  entities: Entity[]
): ComponentProps<typeof Tree>["treeData"] {
  return entities.map((entity) => {
    return {
      key: entity._id,
      title: entity.name,
      children: transformEntitiesToTreedData(entity.entities),
    };
  });
}

export function EntityEditor() {
  const dispatch = useDispatch();
  const { selectedEntities, entities, selectedEntityIds } = useSelector(
    (state: RootState) => {
      const { entities, selectedEntityIds, entitiesIndex } = state.entities;
      const selectedEntities = selectedEntityIds.map((id) => {
        const entityFromIndex = entitiesIndex[id];
        return {
          ...entityFromIndex,
          entities: entityFromIndex.entities.map((id) => entitiesIndex[id]),
        };
      });

      return {
        entities,
        selectedEntities,
        selectedEntityIds,
      };
    }
  );

  return (
    <>
      <Tree
        showLine={true}
        showIcon={true}
        treeData={transformEntitiesToTreedData(entities)}
        multiple={true}
        selectable={true}
        selectedKeys={selectedEntityIds}
        onSelect={(keys) => {
          dispatch(selectEntities(keys as string[]));
        }}
      />
      {selectedEntities.map((entity) => {
        return (
          <div
            key={entity._id}
            style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}
          >
            <EditEntity entity={(entity as unknown) as Entity} />
          </div>
        );
      })}
    </>
  );
}

interface EditEntityProps {
  entity: Entity;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function areTraits(descriptor: any): descriptor is Traits {
  return Array.isArray(descriptor.traits);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDescription(descriptor: any): descriptor is Description {
  return descriptor.description && typeof descriptor.description === "string";
}

interface EditableProps {
  isEditing?: boolean;
  elementType?: string;
  value?: string;
  onSave?: (value: string) => void;
}

export function Editable(props: EditableProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(props.isEditing ?? false);
  const [value, setValue] = useState(props.value ?? "");

  function onSave(e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditing(false);

    props.onSave && props.onSave(value);
  }

  function onEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditing(true);
  }

  if (isEditing) {
    return (
      <div style={{ display: "flex" }}>
        <Input
          onClick={(e) => e.stopPropagation()}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setValue(e.target.value)
          }
          placeholder="Property here"
        />
        <Button
          shape={"circle"}
          size={"small"}
          icon={<CheckOutlined />}
          onClick={onSave}
        />
      </div>
    );
  }

  return (
    <div
      onMouseOver={() => setShowEdit(true)}
      onMouseLeave={() => setShowEdit(false)}
      style={{ display: "flex" }}
    >
      {createElement(props.elementType ?? "span", null, value)}
      {showEdit && (
        <Button
          shape={"circle"}
          size={"small"}
          icon={<EditOutlined />}
          onClick={onEdit}
        />
      )}
    </div>
  );
}

type DescriptorType = "traits" | "description";

interface FormDescriptor {
  id: string | number;
  name: string;
  type: DescriptorType;
  traits?: string[];
  description?: string;
}

function transformDescriptors(descriptors: Descriptor[]): FormDescriptor[] {
  return descriptors.map((descriptor, index) => {
    return {
      id: index,
      type: areTraits(descriptor) ? "traits" : "description",
      name: descriptor.name,
      traits: areTraits(descriptor) ? descriptor.traits : undefined,
      description: isDescription(descriptor)
        ? descriptor.description
        : undefined,
    };
  });
}

function transformFormDescriptors(descriptors: FormDescriptor[]): Descriptor[] {
  return descriptors.map((d) => {
    if (d.type === "traits") {
      return {
        name: d.name,
        traits: d.traits ?? [],
      };
    }

    return {
      name: d.name,
      description: d.description ?? "",
    };
  });
}

function EditEntity(props: EditEntityProps) {
  const { entity } = props;
  const { selectedEntityIds } = useSelector(
    (state: RootState) => state.entities
  );
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(props.entity.isEditing ?? false);
  const [descriptors, setDescriptors] = useState(
    transformDescriptors(entity.descriptors)
  );
  const [form] = Form.useForm();

  useEffect(() => {
    setDescriptors(transformDescriptors(entity.descriptors));
  }, [entity]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSaveEntity(values: { [name: string]: any }) {
    const updatedDescriptors = descriptors.map((d) => {
      return {
        ...d,
        name: values[`descriptor-${d.id}-name`],
        description: values[`descriptor-${d.id}-description`],
        type: values[`descriptor-${d.id}-type`],
      };
    });

    console.log(values, transformFormDescriptors(updatedDescriptors));

    dispatch(
      updateEntity({
        ...entity,
        name: values.name,
        isEditing: false,
        shouldDeepLink: values.shouldDeepLink,
        shouldAutoComplete: values.shouldAutoComplete,
        descriptors: transformFormDescriptors(updatedDescriptors),
      })
    );

    setIsEditing(false);
    // if (value.length > 0) {
    //     dispatch(findAndReplace([entity.name, value]))
    // }
  }

  const onClickEntity = (id: string) => () => {
    if (selectedEntityIds.indexOf(id) === -1) {
      const ids = selectedEntityIds.concat(id);

      dispatch(selectEntities(ids));
    }
  };

  const onClickEditEntity = (entity: Entity) => () => {
    setIsEditing(true);

    dispatch(
      updateEntity({
        ...entity,
        isEditing: true,
      })
    );
  };

  const onClickAddEntity = (entity: Entity) => () => {
    dispatch(addEntity(entity));
  };

  function onDeselectEntity() {
    dispatch(deselectEntities([entity._id]));
  }

  function onSelectDescriptorType(
    descriptor: FormDescriptor,
    type: DescriptorType
  ) {
    const descriptionIndex = descriptors.findIndex(
      (d) => d.id === descriptor.id
    );

    if (descriptionIndex === -1) {
      return;
    }

    const descriptorsMutable = [...descriptors];
    descriptorsMutable[descriptionIndex] = {
      ...descriptor,
      type,
    };

    setDescriptors(descriptorsMutable);
  }

  function onTraitsChanged(descriptor: FormDescriptor, traits: string[]) {
    const updatedDescriptors = descriptors.map((d) => {
      if (d.id === descriptor.id) {
        return {
          ...descriptor,
          traits,
        };
      }

      return d;
    });

    setDescriptors(updatedDescriptors);
  }

  function onRemoveDescriptor(descriptorId: number) {
    const descriptorsMutable = [...descriptors];
    const index = descriptors.findIndex((d) => d.id === descriptorId);
    descriptorsMutable.splice(index, 1);

    setDescriptors(descriptorsMutable);
  }

  return (
    <Card
      actions={[
        <PlusOutlined onClick={onClickAddEntity(entity)} />,
        <EditOutlined onClick={onClickEditEntity(entity)} />,
        <DeleteOutlined onClick={() => console.log("delete")} />,
        <EllipsisOutlined onClick={() => console.log("ellipsis")} />,
      ]}
      title={<h3>{entity.name}</h3>}
      extra={
        <div>
          <Button
            size={"small"}
            onClick={onDeselectEntity}
            icon={<MinusOutlined />}
          />
        </div>
      }
    >
      {isEditing && (
        <Form
          form={form}
          onFinish={onSaveEntity}
          initialValues={{
            name: props.entity.name,
            shouldDeepLink: props.entity.shouldDeepLink,
            shouldAutoComplete: props.entity.shouldAutoComplete,
          }}
        >
          <Form.Item label={"Entity Name"} name={"name"}>
            <Input placeholder={"Entity name"} onChange={console.log} />
          </Form.Item>
          <Form.Item name={"shouldAutoComplete"} label="Enable Word Completion">
            <Switch
              defaultChecked={props.entity.shouldAutoComplete}
              size={"small"}
            />
          </Form.Item>
          <Form.Item name={"shouldDeepLink"} label="Enable Deep Linking">
            <Switch
              defaultChecked={props.entity.shouldDeepLink}
              size={"small"}
            />
          </Form.Item>
          {descriptors.map((descriptor, index) => {
            const id = `descriptor-${index}`;

            return (
              <Card
                style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}
                title={<h4>{descriptor.name}</h4>}
                extra={
                  <Button
                    onClick={() => onRemoveDescriptor(descriptor.id as number)}
                    size={"small"}
                    icon={<MinusOutlined />}
                  />
                }
              >
                <DescriptorForm
                  onTraitsChanged={onTraitsChanged}
                  form={form}
                  onSelectDescriptorType={onSelectDescriptorType}
                  id={id}
                  isEditing={isEditing}
                  descriptor={descriptor}
                />
              </Card>
            );
          })}
          <Button
            type={"dashed"}
            onClick={() =>
              setDescriptors((d) =>
                d.concat({
                  id: descriptors.length + 1,
                  name: "Untitled",
                  type: "description",
                  description: "",
                })
              )
            }
          >
            + Add Descriptor
          </Button>
          <Form.Item>
            <Button htmlType={"submit"}>Save</Button>
          </Form.Item>
          <Button onClick={() => setIsEditing(false)}>Cancel</Button>
        </Form>
      )}

      {entity.entities.length > 0 && (
        <>
          <Divider />
          <h4>Entities:</h4>
        </>
      )}
      {entity.entities.map((entity) => {
        return (
          <div key={entity._id}>
            <h5 onClick={onClickEntity(entity._id)} key={entity._id}>
              {entity.name}
            </h5>
          </div>
        );
      })}
    </Card>
  );
}

interface TagInputProps extends ComponentProps<typeof Tag> {
  value?: string;
  isEditable?: boolean;
  onSave?: (value: string) => void;
}

function TagInput(props: TagInputProps) {
  const { value: inputValue, onSave, onClose, ...tagProps } = props;
  const [value, setValue] = useState(inputValue ?? "");
  const [isEditing, setIsEditing] = useState(false);

  function onSaveValue() {
    console.log("how many times now");
    setIsEditing(false);
    setValue(value);

    props.onSave && props.onSave(value);
  }

  function onCloseClick() {
    setIsEditing(false);

    onClose && onClose();
  }

  return isEditing ? (
    <Input
      onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      value={value}
      size="small"
      onBlur={onSaveValue}
      onPressEnter={onSaveValue}
    />
  ) : (
    <Tag
      onClick={() => setIsEditing(true)}
      onClose={onCloseClick}
      {...tagProps}
    >
      {value}
    </Tag>
  );
}

interface DescriptorFormProps {
  id: string;
  descriptor: FormDescriptor;
  isEditing?: boolean;
  onSelectDescriptorType?: (
    descriptor: FormDescriptor,
    type: DescriptorType
  ) => void;
  onTraitsChanged?: (descriptor: FormDescriptor, traits: string[]) => void;
  form?: ComponentProps<Form>["form"];
}

function DescriptorForm(props: DescriptorFormProps) {
  const { id, descriptor } = props;
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [traits, setTraits] = useState<string[]>(descriptor.traits ?? []);
  const [addTraitValue, setAddTraitValue] = useState("");

  useEffect(() => {
    if (props.form) {
      props.form.setFieldsValue({ [`${id}-name`]: descriptor.name });
      props.form.setFieldsValue({
        [`${id}-description`]: descriptor.description,
      });
      props.form.setFieldsValue({ [`${id}-type`]: descriptor.type });
    }
  }, [
    descriptor.description,
    descriptor.name,
    descriptor.type,
    id,
    props.form,
  ]);

  const onSelectDescriptorType = (descriptor: FormDescriptor) => (
    type: DescriptorType
  ) => {
    props.onSelectDescriptorType &&
      props.onSelectDescriptorType(descriptor, type);
  };

  useEffect(() => {
    props.onTraitsChanged && props.onTraitsChanged(descriptor, traits);
  }, [descriptor, props, traits]);

  function onSaveTag(value: string, index?: number) {
    if (typeof index !== "undefined") {
      const traitsMutable = Array.from(traits);

      if (value.length > 0) {
        traitsMutable[index] = value;
      } else {
        traitsMutable.splice(index, 1);
      }

      setTraits(traitsMutable);
    } else {
      if (value.length > 0) {
        setTraits((traits) => traits.concat(value));
      }
    }
  }

  function onNewTrait() {
    onSaveTag(addTraitValue);
    setIsEditingTag(false);
    setAddTraitValue("");
  }

  return (
    <div>
      <Form.Item label={"Name"} name={`${id}-name`}>
        <Input />
      </Form.Item>
      <Form.Item name={`${id}-type`} label={"Type"}>
        <Select onChange={onSelectDescriptorType(descriptor)}>
          <Select.Option value="description">Description</Select.Option>
          <Select.Option value="traits">Traits</Select.Option>
        </Select>
      </Form.Item>
      {descriptor.type === "traits" ? (
        <div>
          {traits.map((trait, index) => {
            return (
              <div key={`${trait}-index`}>
                <TagInput
                  value={trait}
                  closable={props.isEditing}
                  onSave={(value) => onSaveTag(value, index)}
                />
              </div>
            );
          })}
          {isEditingTag ? (
            <Input
              autoFocus={true}
              value={addTraitValue}
              size="small"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAddTraitValue(e.target.value)
              }
              onBlur={onNewTrait}
              onPressEnter={onNewTrait}
            />
          ) : (
            <Tag
              className="site-tag-plus"
              onClick={() => setIsEditingTag(true)}
            >
              <PlusOutlined /> New Trait
            </Tag>
          )}
        </div>
      ) : (
        <Form.Item label={"Description"} name={`${id}-description`}>
          <Input />
        </Form.Item>
      )}
    </div>
  );
}
