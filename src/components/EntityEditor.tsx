import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../modules";
import {
  addEntity,
  Entity,
  selectEditSettingsEntity,
  selectEntity,
  setDeleteEntityModal,
  setEditEntityModal,
  updateEntities,
} from "../modules/entities";
import {
  Button,
  Tag,
  Input,
  Tree,
  Collapse,
  PageHeader,
  Dropdown,
  Menu,
  Form,
  Empty,
} from "antd";
import {
  ChangeEvent,
  ComponentProps,
  createElement,
  useState,
  useEffect,
} from "react";
import {
  EditOutlined,
  CheckOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { DbEntity } from "../index";
import { ClickParam } from "antd/lib/menu";
import { FormInstance } from "antd/lib/form";

export function transformEntitiesToTreedData(
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

export function entitiesToOrderedFlatMap(
  entities: Entity[],
  flatMap: Entity[] = []
): Entity[] {
  entities.forEach((entity) => {
    flatMap.push(entity);
    entitiesToOrderedFlatMap(entity.entities, flatMap);
  });

  return flatMap;
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

interface EntityListProps {
  entities: Entity[];
}

export function EntityListContainer() {
  const dispatch = useDispatch();
  const { entities } = useSelector((state: RootState) => state.entities);

  function onClickAddEntity() {
    dispatch(selectEditSettingsEntity());
    dispatch(setEditEntityModal(true));
  }

  return (
    <div>
      <PageHeader
        title="Entities"
        subTitle="Write to an interface"
        extra={<Button onClick={onClickAddEntity}>Add Entity</Button>}
      >
        <Input placeholder={"Filter"} />
      </PageHeader>
      <EntityList entities={entities} />
    </div>
  );
}

export function EntityList(props: EntityListProps) {
  const { entities } = props;
  const dispatch = useDispatch();

  function onClickSettings(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const onEdit = (id: string) => () => {
    dispatch(selectEntity(id));
  };

  function addEntity() {
    dispatch(selectEditSettingsEntity());
    dispatch(setEditEntityModal(true));
  }

  function onAddEntity(e: ClickParam) {
    e.domEvent.stopPropagation();
    addEntity();
  }

  const onEditSettings = (id: string) => (e: ClickParam) => {
    e.domEvent.stopPropagation();
    dispatch(setEditEntityModal(true));
    dispatch(selectEditSettingsEntity(id));
  };

  const onDeleteEntity = (id: string) => (e: ClickParam) => {
    e.domEvent.stopPropagation();
    dispatch(setDeleteEntityModal(true));
  };

  return (
    <div>
      {entities.map((entity) => {
        return (
          <Collapse key={entity._id} expandIconPosition={"right"}>
            <Collapse.Panel
              header={entity.name}
              extra={
                <Dropdown
                  trigger={["click"]}
                  overlay={
                    <Menu>
                      <Menu.Item onClick={onAddEntity}>Add entity</Menu.Item>
                      <Menu.Item onClick={onEditSettings(entity._id)}>
                        Edit entity
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        onClick={onDeleteEntity(entity._id)}
                        style={{ color: "red" }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <SettingOutlined onClick={onClickSettings} />
                </Dropdown>
              }
              key={`${entity._id}-panel`}
            >
              <div style={{ marginBottom: "1rem" }}>
                {entity.description.length === 0 &&
                entity.entities.length === 0 ? (
                  <Empty description={"Nothing here yet!"}>
                    <Button type={"primary"} onClick={onEdit(entity._id)}>
                      Start writing
                    </Button>
                    <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                      or
                    </div>
                    <Button type={"primary"} onClick={addEntity}>
                      Add a new entity
                    </Button>
                  </Empty>
                ) : (
                  <div>
                    <p>{entity.description}</p>
                    <Button
                      type={"dashed"}
                      size={"small"}
                      onClick={onEdit(entity._id)}
                    >
                      {entity.description.length > 0
                        ? "Edit"
                        : "Add a description"}
                    </Button>
                  </div>
                )}
              </div>
              <EntityList entities={entity.entities} />
            </Collapse.Panel>
          </Collapse>
        );
      })}
    </div>
  );
}

interface EditEntitySettingsProps {
  form?: FormInstance;
}

export const EditEntitySettings = (props: EditEntitySettingsProps) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm(props.form);
  const { entity } = useSelector((state: RootState) => {
    const { editSettingsEntityId, entitiesIndex } = state.entities;
    const entity = editSettingsEntityId
      ? entitiesIndex[editSettingsEntityId]
      : undefined;

    return {
      entity,
    };
  });

  useEffect(() => {
    console.log(entity, "entity");
    form.setFieldsValue({
      name: entity ? entity.name : "",
    });
  }, [entity]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSaveEntity(values: { [name: string]: any }) {
    if (entity) {
      await dispatch(
        updateEntities({
          ...entity,
          name: values.name,
          isEditing: false,
          shouldDeepLink: values.shouldDeepLink,
          shouldAutoComplete: values.shouldAutoComplete,
        })
      );
    } else {
      dispatch(
        addEntity({
          name: values.name,
          shouldDeepLink: values.shouldDeepLink,
          shouldAutoComplete: values.shouldAutoComplete,
        })
      );
    }

    dispatch(setEditEntityModal(false));
    form.resetFields();
    // if (value.length > 0) {
    //     dispatch(findAndReplace([entity.name, value]))
    // }
  }

  return (
    <Form
      form={form}
      initialValues={{
        name: entity?.name,
      }}
      onFinish={onSaveEntity}
    >
      <Form.Item
        label={"Entity Name"}
        name={"name"}
        rules={[{ required: true }]}
      >
        <Input placeholder={"Untitled"} name={"name"} />
      </Form.Item>
    </Form>
  );
};

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
