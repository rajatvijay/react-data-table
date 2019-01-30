import React, { Component, Fragment } from "react";
import {
  Table as AntTable,
  Input,
  Icon,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Popconfirm,
  Form
} from "antd";

/**
 * TODO: Try and make search and clear using the same function
 * TODO: Dont use diff variables i.e.: `page` and `current` for current page state
 */

class SearchFilter extends Component {
  state = {
    value: null
  };
  handleChange = e => {
    e.stopPropagation();
    const { value } = e.target;
    this.setState({ value }, () => {
      if (!this.state.value) {
        this.props.onClear();
      }
    });
  };
  handleSearch = e => {
    e.stopPropagation();
    const { value } = this.state;
    if (value) {
      this.props.onSearch(value);
    }
  };
  render() {
    const { placeholder } = this.props;
    const { value } = this.state;
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <Input
          value={value}
          style={{ minWidth: 100 }}
          onChange={this.handleChange}
          onPressEnter={this.handleSearch}
          placeholder={placeholder}
        />
        <Button
          type="primary"
          onClick={this.handleSearch}
          style={{ marginLeft: 5 }}
        >
          <Icon type="search" />
        </Button>
      </div>
    );
  }
}

class DropdownFilter extends Component {
  render() {
    const { options } = this.props;
    return (
      <Select onChange={this.props.onSearch} style={{ minWidth: 100 }}>
        <Select.Option value={undefined}>All</Select.Option>
        {options.map(o => (
          <Select.Option value={o.value}>{o.label}</Select.Option>
        ))}
      </Select>
    );
  }
}

class DateFilter extends Component {
  render() {
    return (
      <DatePicker
        size="small"
        onChange={d => this.props.onSearch(+d)}
        style={{ minWidth: 100 }}
      />
    );
  }
}

function getFilterField({ dataType, title, onSearch, onClear }) {
  //   console.log("GET FIELD TYPE", dataType, title, column);
  if (dataType === "list") {
    return <span>List Filter</span>;
  }

  if (dataType === "boolean") {
    const options = [
      { value: false, label: "No" },
      { value: true, label: "Yes" }
    ];
    return <DropdownFilter options={options} onSearch={onSearch} />;
  }

  if (dataType === "date") {
    return <DateFilter onSearch={onSearch} />;
  }

  return (
    <SearchFilter
      placeholder={`Search ${title.toLowerCase()}`}
      onSearch={onSearch}
      onClear={onClear}
    />
  );
}

function HeaderRow(props) {
  //   console.log("Header Props", props);

  /**
   * prop.children[0].props <Object>
   * @param {string} title:: Display name
   * @param {string} dataIndex:: Accessor key relative to  the dataSource
   * @param {string | number} key:: Unique key for React VDOM
   * @param {string} dataType:: string | boolean | integer | list
   * @param {boolean} filterable:: Is filterable
   * @param {Function} onSearch:: Callback for column search
   */
  const childrenProps = props.children.map(c => {
    const {
      title,
      dataIndex,
      dataType,
      filterable,
      onSearch,
      onClear
    } = c.props;
    return {
      title,
      dataIndex,
      dataType,
      filterable,
      onSearch,
      onClear
    };
  });
  const hasAtleastOneFilter = !!childrenProps.find(prop => prop.filterable);

  // If there is no filter return the normal header
  if (!hasAtleastOneFilter) {
    return <tr {...props} />;
  }

  return (
    <Fragment>
      <tr {...props} />
      <tr>
        {childrenProps.map(c => {
          return (
            <th key={c.dataIndex}>{c.filterable ? getFilterField(c) : null}</th>
          );
        })}
      </tr>
    </Fragment>
  );
}

const FormItem = Form.Item;
const EditableContext = React.createContext();

const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

class EditableCell extends React.Component {
  getInput = () => {
    if (this.props.dataType === "number") {
      return <InputNumber />;
    }
    return <Input />;
  };

  render() {
    const {
      editing,
      dataIndex,
      title,
      isEditable,
      inputType,
      record,
      index,
      ...restProps
    } = this.props;
    return (
      <EditableContext.Consumer>
        {form => {
          const { getFieldDecorator } = form;
          return (
            <td {...restProps}>
              {editing && isEditable ? (
                <FormItem style={{ margin: 0 }}>
                  {getFieldDecorator(dataIndex, {
                    rules: [
                      {
                        required: true,
                        message: `Please Input ${title}!`
                      }
                    ],
                    initialValue: record[dataIndex]
                  })(this.getInput())}
                </FormItem>
              ) : (
                <div style={restProps.width ? { width: restProps.width } : {}}>
                  {restProps.children}
                </div>
              )}
            </td>
          );
        }}
      </EditableContext.Consumer>
    );
  }
}

class DataTable extends Component {
  static defaultProps = {
    size: "small"
  };

  componentDidUpdate(prevProps) {
    // Transforming columns and setting in the state
    // whenever columns prop changes
    if (prevProps.columns !== this.props.columns) {
      this.setState({
        columns: this.transformColumns(this.props.columns, this.props.editable)
      });
    }

    // Update pagination if new comes from props
    if (prevProps.pagination !== this.props.pagination) {
      this.setState(state => ({
        ...state.pagination,
        ...this.props.pagination
      }));
    }
  }

  // For sending out
  getPaginationParamsForSearch = () => {
    const { pageSize } = this.state;
    return {
      size: pageSize,
      page: this.defaultCurrentPage
    };
  };

  // For sending out
  getQueryParamsForSearch = (field, value) => {
    const { searchState, pagination } = this.state;
    const searchParams = {
      ...searchState,
      [field]: value
    };

    const paginationParams = this.getPaginationParamsForSearch();
    return {
      search: searchParams,
      ...paginationParams
    };
  };

  onSearch = (field, callback) => value => {
    // console.log("SEARCH INITIALISED: ", field, value);

    // Preserving the search state
    this.setState(
      state => ({
        pagination: {
          ...state.pagination,
          current: this.defaultCurrentPage
        },
        searchState: { ...state.searchState, [field]: value }
      }),
      () => {
        callback(this.getQueryParamsForSearch(field, value), {
          field,
          value,
          pagination: this.getPaginationParamsForSearch()
        });
      }
    );
  };

  onClear = (field, callback) => () => {
    const { searchState } = this.state;

    if (searchState[field]) {
      // clearing the field from the search state
      this.setState(
        state => ({
          pagination: {
            ...state.pagination,
            current: this.defaultCurrentPage
          },
          searchState: { ...state.searchState, [field]: undefined }
        }),
        () => {
          callback(this.getQueryParamsForSearch(field, undefined), {
            field,
            value: "",
            pagination: this.getPaginationParamsForSearch()
          });
        }
      );
    }
  };

  transformColumns = (columns, isTableEditable) => {
    const transformedColumns = columns.reduce((transformedColumns, column) => {
      const {
        isEditable,
        isFilterable,
        onSearch,
        isSortable,

        /**
         * keysRequiredByLib <Object> :: These are just the minimum requirements
         * @param {string} title:: Display name
         * @param {string} dataIndex: Accessor key relative to  the dataSource
         * @param {string | number} key: Unique key for React VDOM
         * @param {string} dataType: string | boolean | integer | list
         */
        ...keysRequiredByLib
      } = column;
      transformedColumns.push({
        ...keysRequiredByLib,
        sorter: isSortable,
        // editable: column.isEditable,
        // filterable: column.isFilterable
        onHeaderCell: column => {
          //   console.log("calling onHeaderCell");
          return {
            ...keysRequiredByLib,
            filterable: isFilterable,
            onSearch: this.onSearch(keysRequiredByLib.dataIndex, onSearch),
            onClear: this.onClear(keysRequiredByLib.dataIndex, onSearch)
          };
        },
        onCell: record => {
          //   console.log("calling onCell");
          return {
            ...keysRequiredByLib,
            record,
            isEditable: isEditable,
            editing: this.isEditing(record)
          };
        }
      });
      return transformedColumns;
    }, []);

    // If the table has editing enabled
    // Add the actions items
    if (isTableEditable) {
      transformedColumns.push({
        title: "Actions",
        dataIndex: "actions",
        render: (_, record) => {
          const editable = this.isEditing(record);
          return (
            <div>
              {editable ? (
                <span>
                  <EditableContext.Consumer>
                    {form => (
                      <a
                        href="javascript:;"
                        onClick={() => this.save(form, record.key)}
                        style={{ marginRight: 8 }}
                      >
                        Save
                      </a>
                    )}
                  </EditableContext.Consumer>
                  <Popconfirm
                    title="Sure to cancel?"
                    onConfirm={() => this.cancel(record.key)}
                  >
                    <a>Cancel</a>
                  </Popconfirm>
                </span>
              ) : (
                <a onClick={() => this.edit(record.key)}>Edit</a>
              )}
            </div>
          );
        }
      });
    }

    // console.log("TR", transformedColumns);
    return transformedColumns;
  };

  handleTableChange = (pagination, _, sorters) => {
    // console.log("P", pagination);
    let change = {};

    const { pageSize, current } = pagination;

    // If the current page has changed
    // create the change object with `changed` params
    if (current !== this.state.pagination.current) {
      change = {
        size: pageSize,
        page: current ? current - 1 : current,
        ...change
      };

      // Also update it in the state
      this.setState(state => ({
        pagination: { ...state.pagination, current }
      }));
    } else {
      // If the current page has not changed
      // implies only the sorters have been applied
      // create the change object with `default` params
      change = {
        size: this.defaultPageSize,
        page: this.defaultCurrentPage,
        ...change
      };

      // Update the state with the default current page
      this.setState(state => ({
        pagination: { ...state.pagination, current: this.defaultCurrentPage }
      }));
    }

    // console.log("S", sorters);
    const { field, order } = sorters;

    if (field && order) {
      change = {
        sort: field,
        order: {
          ascend: "asc",
          descend: "desc"
        }[order],
        ...change
      };
    }

    // Preserving search when pagination or sorting is done
    const { searchState } = this.state;
    change = {
      search: {
        ...searchState
      },
      ...change
    };

    // console.log("CHANGE OBJECT", change);
    return this.props.onChange(change);
  };

  isEditing = record => record.key === this.state.editingKey;

  cancel = () => {
    this.setState({ editingKey: "" });
  };

  save = (form, key) => {
    form.validateFields((error, row) => {
      if (error) {
        return;
      }

      // Initiate the API call and then toggle the editing state
      this.props.onSave(row, key);
      this.setState({ editingKey: "" });
    });
  };

  edit = key => {
    this.setState({ editingKey: key });
  };

  // Initializing state after all instance methods has been declared
  state = {
    editingKey: "",

    // Initializing state with props after some transformations
    columns: this.transformColumns(this.props.columns, this.props.editable),

    // Storing pagination in state for giving it a controlled pagination
    pagination: { ...this.props.pagination, current: 1 },

    // Search state
    searchState: {}
  };

  // Creating as a static property, rather than creating the object in render method
  // to save creating object on each render call
  tableComponents = {
    header: {
      row: HeaderRow
    },
    body: {
      row: EditableFormRow,
      cell: EditableCell
    }
  };

  loadingProps = {
    indicator: <Icon type="loading" style={{ fontSize: 48 }} spin />
  };

  defaultPageSize = 10;

  defaultCurrentPage = 0;

  render() {
    const {
      dataSource,
      isLoading,
      pagination: paginationProps, // CAUTION: Don't remove this
      onChange,
      editable,
      size,
      columns: columnsProp, // CAUTION: Don't remove this
      ...rest
    } = this.props;
    const { columns, pagination } = this.state;

    // Use it for performance optimization
    // Reduce the no of times render is called
    // console.log("RENDERING");

    return (
      <AntTable
        components={this.tableComponents}
        dataSource={dataSource}
        columns={columns}
        loading={isLoading ? this.loadingProps : false}
        pagination={pagination}
        onChange={this.handleTableChange}
        size={size}
        {...rest}
      />
    );
  }
}

export default DataTable;
