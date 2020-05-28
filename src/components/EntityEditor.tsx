import * as React from "react";
import {
  ChangeEvent,
  ComponentProps,
  createElement,
  useEffect,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../modules";
import {
  addEntity,
  EditEntityModes,
  Entity,
  selectEditSettingsEntity,
  selectEntity,
  setEditEntityModal,
  updateEntities,
} from "../modules/entities";
import {
  Button,
  Collapse,
  Dropdown,
  Empty,
  Form,
  Input,
  Menu,
  Modal,
  PageHeader,
  Tag,
  Tree,
  Switch,
  Select,
} from "antd";
import {
  CheckOutlined,
  EditOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { ClickParam } from "antd/lib/menu";
import { FormInstance } from "antd/lib/form";
import { ExclamationCircleOutlined } from "@ant-design/icons/lib";
import { DbEntity } from "../index";
import ReactMarkdown from "react-markdown";
import { useDebouncedCallback } from "use-debounce";

export function transformEntitiesToTreedData(
  entities: Entity[]
): ComponentProps<typeof Tree>["treeData"] {
  return entities.map((entity) => {
    return {
      key: entity._id,
      icon: undefined,
      title: (
        <Collapse>
          <Collapse.Panel
            showArrow={false}
            header={entity.name}
            key={entity._id}
          >
            <div>test</div>
          </Collapse.Panel>
        </Collapse>
      ),
      children: transformEntitiesToTreedData(entity.entities),
    };
  });
}

function getAllParents(
  entity: Entity | DbEntity,
  index: { [key: string]: DbEntity },
  parents: DbEntity[] = []
): DbEntity[] {
  if (!entity.entity) {
    return parents;
  }

  const parent = index[entity.entity];
  parents.push(parent);

  return getAllParents(parent, index, parents);
}

type EntityWithChildren<T> = {
  entities: EntityWithChildren<T>[];
};

function getAllChildren(
  entity: DbEntity,
  index: { [key: string]: DbEntity },
  children: DbEntity[] = []
) {
  if (entity.entities.length === 0) {
    return children;
  }

  entity.entities.forEach((entity) => {
    const entityFromIndex = index[entity];
    children.push(entityFromIndex);

    getAllChildren(entityFromIndex, index, children);
  });

  return children;
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
  const { value: propValue } = props;
  const [showEdit, setShowEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(props.isEditing ?? false);
  const [value, setValue] = useState(propValue ?? "");

  useEffect(() => {
    if (propValue) {
      setValue(propValue);
    }
  }, [propValue]);

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
  depth?: number;
}

export function EntityListContainer() {
  const dispatch = useDispatch();
  const {
    entities,
    flatEntities,
    entitiesIndex,
    selectedEntities,
  } = useSelector((state: RootState) => {
    const { entities, flatEntities, entitiesIndex } = state.entities;
    const selectedEntities = flatEntities
      .filter((entity) => entity.isVisible)
      .map((entity) => entity.name);
    return {
      entities,
      flatEntities,
      entitiesIndex,
      selectedEntities,
    };
  });

  function onClickAddEntity() {
    dispatch(selectEditSettingsEntity());
    dispatch(setEditEntityModal(true, EditEntityModes.Add));
  }

  return (
    <div>
      <PageHeader
        title="Entities"
        subTitle="Write to an interface"
        extra={
          <Dropdown
            trigger={["click"]}
            overlay={
              <Menu>
                <Menu.Item onClick={onClickAddEntity}>Add Entity</Menu.Item>
                <Menu.Item>Manage Entities</Menu.Item>
              </Menu>
            }
          >
            <SettingOutlined />
          </Dropdown>
        }
      >
        <Select
          mode={"multiple"}
          style={{ width: "100%" }}
          placeholder={"Filter"}
          value={selectedEntities}
          onSelect={(_, data) => {
            if (data.key) {
              const entity = entitiesIndex[data.key];
              const parents = getAllParents(entity, entitiesIndex);
              const transformedParents = parents.map((parent) => {
                return {
                  ...parent,
                  isVisible: true,
                };
              });

              dispatch(
                updateEntities([
                  {
                    ...entity,
                    isVisible: true,
                  },
                  ...transformedParents,
                ])
              );
            }
          }}
          onDeselect={(_, data) => {
            if (data.key) {
              const entity = entitiesIndex[data.key];

              dispatch(
                updateEntities({
                  ...entity,
                  isVisible: false,
                })
              );
            }
          }}
        >
          {flatEntities.map((entity) => {
            return (
              <Select.Option value={entity.name} key={entity._id}>
                {entity.name}
              </Select.Option>
            );
          })}
        </Select>
      </PageHeader>
      <EntityList entities={entities} />
    </div>
  );
}

export function EntityList(props: EntityListProps) {
  const { entitiesIndex, areEntitiesSelected } = useSelector(
    (state: RootState) => {
      const { entitiesIndex, flatEntities } = state.entities;
      const areEntitiesSelected = flatEntities.some(
        (entity) => entity.isVisible
      );

      return {
        entitiesIndex,
        areEntitiesSelected,
      };
    }
  );
  const { entities, depth = 0 } = props;
  const dispatch = useDispatch();
  const [debouncedCallback] = useDebouncedCallback(
    (entity: Entity, isOpen: boolean) => {
      dispatch(
        updateEntities({
          ...entity,
          isOpen,
        })
      );
    },
    1000
  );

  function onClickSettings(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const onEdit = (id: string) => () => {
    dispatch(selectEntity(id));
  };

  function onAddEntity(id: string) {
    dispatch(selectEditSettingsEntity(id));
    dispatch(setEditEntityModal(true, EditEntityModes.Add));
  }

  const onAddEntityFromMenu = (id: string) => (e: ClickParam) => {
    e.domEvent.stopPropagation();
    onAddEntity(id);
  };

  const onEditSettings = (id: string) => (e: ClickParam) => {
    e.domEvent.stopPropagation();
    dispatch(setEditEntityModal(true, EditEntityModes.Edit));
    dispatch(selectEditSettingsEntity(id));
  };

  const onDeleteEntity = (entity: Entity) => (e: ClickParam) => {
    e.domEvent.stopPropagation();

    const parent = entity.entity ? entitiesIndex[entity.entity] : undefined;

    const updatedParent: DbEntity[] = [];
    if (parent) {
      const mutableParentEntities = [...parent.entities];
      mutableParentEntities.splice(
        parent.entities.findIndex((id) => entity._id === id)
      );

      updatedParent.push({
        ...parent,
        entities: mutableParentEntities,
      });
    }

    const cascadedEntities = entity.entities.map((entity) => {
      return {
        ...entity,
        _deleted: true,
      };
    });

    Modal.confirm({
      title: "Are you sure delete this entity?",
      content:
        "All entities attached under this entity will be deleted as well.",
      icon: <ExclamationCircleOutlined />,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk() {
        dispatch(
          updateEntities([
            {
              ...entity,
              _deleted: true,
            },
            ...cascadedEntities,
            ...updatedParent,
          ])
        );
      },
    });
  };

  return (
    // <ReactSortable
    //   list={entities.map((entity) => {
    //     return {
    //       ...entity,
    //       id: entity._id,
    //     };
    //   })}
    //   setList={(newList, sortable, store) => {
    //     if (store.dragging) {
    //       console.log('dragging')
    //     } else {
    //       console.log('not dragging')
    //     }
    //   }}
    //   onUpdate={console.log}
    //   onEnd={(evt, x, y) => {
    //     console.log(evt, "end")
    //     console.log(x)
    //     console.log(y)
    //   }}
    //   group={{ name: "root", put: true, pull: true }}
    //   animation={150}
    //   fallbackOnBody={true}
    //   invertSwap={true}
    //   ghostClass={"ghost"}
    // >
    <div>
      {entities.map((entity) => {
        if (areEntitiesSelected && !entity.isVisible) {
          return null;
        }

        return (
          <div data-id={entity._id} key={entity._id}>
            <Collapse
              defaultActiveKey={
                entity.isOpen ? `${entity._id}-panel` : undefined
              }
              onChange={(panelKeys) => {
                let isOpen = false;
                if (Array.isArray(panelKeys)) {
                  if (panelKeys.length > 0) {
                    isOpen = true;
                  }
                }

                debouncedCallback(entity, isOpen);
              }}
              className={"entity-panel"}
              expandIconPosition={"right"}
            >
              <Collapse.Panel
                key={`${entity._id}-panel`}
                header={entity.name}
                extra={
                  <Dropdown
                    trigger={["click"]}
                    overlay={
                      <Menu>
                        <Menu.Item onClick={onAddEntityFromMenu(entity._id)}>
                          Add entity
                        </Menu.Item>
                        <Menu.Item onClick={onEditSettings(entity._id)}>
                          Edit entity
                        </Menu.Item>
                        <Menu.Item>Move</Menu.Item>
                        <Menu.Item>Clone</Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          onClick={onDeleteEntity(entity)}
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
              >
                <div style={{ marginBottom: "1rem" }}>
                  {entity.description.length === 0 &&
                  entity.entities.length === 0 ? (
                    <Empty description={"Nothing here yet!"}>
                      <Button type={"primary"} onClick={onEdit(entity._id)}>
                        Start writing
                      </Button>
                      <div
                        style={{
                          marginTop: "1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        or
                      </div>
                      <Button
                        type={"primary"}
                        onClick={() => onAddEntity(entity._id)}
                      >
                        Add a new entity
                      </Button>
                    </Empty>
                  ) : (
                    <div>
                      <ReactMarkdown source={entity.description} />
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
                <EntityList entities={entity.entities} depth={depth + 1} />
              </Collapse.Panel>
            </Collapse>
          </div>
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
  const { entity, editEntityMode } = useSelector((state: RootState) => {
    const {
      editSettingsEntityId,
      entitiesIndex,
      editEntityMode,
    } = state.entities;
    const entity = editSettingsEntityId
      ? entitiesIndex[editSettingsEntityId]
      : undefined;

    return {
      entity,
      editEntityMode,
    };
  });

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      name: editEntityMode === EditEntityModes.Edit ? entity?.name : "",
      shouldAutoComplete:
        editEntityMode === EditEntityModes.Edit
          ? entity?.shouldAutoComplete
          : true,
      parentId: entity?._id,
    });
  }, [entity, editEntityMode, form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSaveEntity(values: { [name: string]: any }) {
    if (editEntityMode === EditEntityModes.Edit && entity) {
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
        addEntity(
          {
            name: values.name,
            shouldDeepLink: values.shouldDeepLink,
            shouldAutoComplete: values.shouldAutoComplete,
          },
          values.parentId
        )
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
      size={"small"}
      form={form}
      initialValues={{
        name: editEntityMode === EditEntityModes.Edit ? entity?.name : "",
        shouldAutoComplete:
          editEntityMode === EditEntityModes.Edit
            ? entity?.shouldAutoComplete
            : true,
        parentId: entity?.entity,
      }}
      onFinish={onSaveEntity}
    >
      <Form.Item style={{ display: "none" }} name={"parentId"}>
        <Input type={"hidden"} />
      </Form.Item>
      <Form.Item
        label={"Entity Name"}
        name={"name"}
        rules={[{ required: true }]}
      >
        <Input placeholder={"Untitled"} />
      </Form.Item>
      <Form.Item
        valuePropName={"checked"}
        label={"Autocomplete"}
        name={"shouldAutoComplete"}
      >
        <Switch />
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
