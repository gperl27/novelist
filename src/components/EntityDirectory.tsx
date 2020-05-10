import { Button, Input, Tree } from "antd";
import { updateEntities } from "../modules/entities";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../modules";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ComponentProps } from "react";
import { transformEntitiesToTreedData } from "./EntityEditor";
import { PlusOutlined } from "@ant-design/icons";

export function EntityDirectory() {
  const dispatch = useDispatch();
  const { entities, selectedEntityIds } = useSelector((state: RootState) => {
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
      entitiesIndex,
    };
  });
  const [isAdding, setIsAdding] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");

  function onSaveNewEntity() {
    if (newEntityName.length > 0) {
      dispatch(
        updateEntities({
          _id: uuidv4(),
          description: "",
          // descriptors: [],
          name: newEntityName,
          type: "entity",
          entities: [],
          isEditing: false,
          shouldAutoComplete: false,
          shouldDeepLink: false,
          // _rev: "",
        })
      );
    }

    setIsAdding(false);
    setNewEntityName("");
  }

  const addEntity: ComponentProps<typeof Tree>["treeData"] = [
    {
      selectable: false,
      key: "add-entity",
      title: (
        <Input
          autoFocus={true}
          onPressEnter={onSaveNewEntity}
          onBlur={onSaveNewEntity}
          size={"small"}
          value={newEntityName}
          onChange={(e) => setNewEntityName(e.target.value)}
        />
      ),
    },
  ];

  return (
    <div>
      <Tree
        draggable={true}
        showLine={true}
        showIcon={true}
        treeData={transformEntitiesToTreedData(entities)?.concat(
          isAdding ? addEntity : []
        )}
        multiple={true}
        selectable={true}
        selectedKeys={selectedEntityIds}
        // onDrop={onDrop}
        onSelect={(keys) => {
          // dispatch(selectEntities(keys as string[]));
        }}
      />
      <Button
        style={{ marginLeft: "0.25rem" }}
        onClick={() => setIsAdding(true)}
        size={"small"}
        type={"dashed"}
        icon={<PlusOutlined />}
      >
        Add Entity
      </Button>
    </div>
  );
}
