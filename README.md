sequenceDiagram
    autonumber
    actor User
    participant UI as Canvas UI (React)
    participant CompFactory as Component Factory
    participant PropFactory as Property Factory
    participant MobX as MobX DSL Store

    %% Stage 1: Drag & Drop and Instantiation
    rect rgb(240, 248, 255)
    Note over User, MobX: Stage 1: Drag & Drop (Instantiation)
    User->>UI: Drag component (e.g., 'Input') to Canvas
    UI->>CompFactory: getDefaultState(type: 'Input')
    CompFactory-->>UI: Return default node schema (id, type, defaultProps)
    UI->>MobX: Action: addNode(nodeSchema)
    MobX->>MobX: Mutate observable DSL tree
    MobX-->>UI: Auto-trigger React render (via observer)
    end

    %% Stage 2: Selection & Property Panel Load
    rect rgb(240, 255, 240)
    Note over User, MobX: Stage 2: Selection & Loading Properties
    User->>UI: Click component on Canvas
    UI->>MobX: Action: setActiveNode(nodeId)
    MobX-->>UI: Auto-update active node state
    UI->>PropFactory: getPropertySchema(type: 'Input')
    PropFactory-->>UI: Return property setters schema
    UI->>UI: Render Property Settings Panel
    end

    %% Stage 3: Property Modification & Sync
    rect rgb(255, 250, 240)
    Note over User, MobX: Stage 3: Modify Props & Data Binding
    User->>UI: Change property in Settings Panel (e.g., edit label)
    UI->>MobX: Action: updateNodeProps(nodeId, newProps)
    MobX->>MobX: Mutate observable active node props
    MobX-->>UI: Auto-trigger Canvas & Panel re-render (via observer)
    UI->>CompFactory: getReactComponent(type)
    CompFactory-->>UI: Return React component class/function
    end

    %% Stage 4: Export DSL
    rect rgb(255, 240, 245)
    Note over User, MobX: Stage 4: Export / Save DSL
    User->>UI: Click 'Save' button
    UI->>MobX: getDSLJson()
    MobX-->>UI: Return serialized JSON tree
    UI-->>User: Show success message
    end
