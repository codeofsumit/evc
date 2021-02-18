import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Tag } from 'antd';
import * as tinycolor from 'tinycolor2';
import { listStockTags, saveStockTag } from 'services/stockTagService';
import StockTag from './StockTag';
import styled from 'styled-components';
import CreatableSelect, { makeCreatableSelect } from 'react-select/creatable';
import Select, { components } from 'react-select';
import chroma from 'chroma-js';
import { v4 as uuidv4 } from 'uuid';

const { Text } = Typography;

const SelectStyled = styled(Select)`
.ant-select-selector {
  flex-direction: column;
}

.ant-select-selection-item {
  width: 100%;
  justify-content: space-between;
  border: none;
  background: transparent;
}

.ant-select-selection-item-content {
  width: 100%;
}
`;

const getFontColor = (backgroundColor) => {
  return tinycolor(backgroundColor).isLight() ? '#000000' : '#ffffff';
}

const Input = props => {
  if (props.isHidden) {
    return <components.Input {...props} />;
  }
  return (
    <div style={{ padding: 6 }}>
      <div style={{ border: `1px dotted #999999`, padding: 0, margin: 0 }}>
        <components.Input {...props} />
      </div>

    </div>
  );
};

const Option = props => {
  const { data, innerProps } = props;
  return <div {...innerProps} style={{ padding: 6 }}>
    {data.color2 ? <StockTag color={data.color}>{data.label}</StockTag> : data.label}
  </div>;
}

const MultiValueLabel = props => {
  return (
    <StockTag color={props.data.color}>{props.data.label}</StockTag>
    // <components.MultiValueLabel {...props} />
  );
};

const colourStyles = {
  // control: styles => ({ ...styles, backgroundColor: 'white' }),
  // option: (styles, { data, isDisabled, isFocused, isSelected }) => {
  //   const color = chroma(data.color);
  //   return {
  //     ...styles,
  //     backgroundColor: isDisabled
  //       ? null
  //       : isSelected
  //         ? data.color
  //         : isFocused
  //           ? color.alpha(0.1).css()
  //           : null,
  //     color: isDisabled
  //       ? '#ccc'
  //       : isSelected
  //         ? chroma.contrast(color, 'white') > 2
  //           ? 'white'
  //           : 'black'
  //         : data.color,
  //     cursor: isDisabled ? 'not-allowed' : 'default',

  //     ':active': {
  //       ...styles[':active'],
  //       backgroundColor: !isDisabled && (isSelected ? data.color : color.alpha(0.3).css()),
  //     },
  //   };
  // },
  // option: (styles) => {
  //   return {
  //     ...styles,
  //     width: '100%',
  //     margin: '6px 0',
  //     padding: 20,
  //     backgroundColor: 'red',
  //   }
  // },
  container: (styles) => {
    return {
      ...styles,
      minWidth: '180px'
    }
  },
  multiValue: (styles, { data }) => {
    return {
      ...styles,
      // width: '100%',
      margin: '4px',
      // backgroundColor: data.color,
      // backgroundColor: data.color,
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    // width: '100%',
    // color: getFontColor(data.color),
    // backgroundColor: data.color,
    borderRadius: '4px 0 0 4px',
  }),
  multiValueRemove: (styles, { data }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      // backgroundColor: data.color,
      borderRadius: '0 4px 4px 0',
      ':hover': {
        // backgroundColor: data.color, //color.alpha(0.5).css(),
        // color: 'white',
      },
    }
  },
};

function convertTagToOption(tag) {
  return {
    label: tag.name,
    value: tag.id,
    color: tag.color
  };
}

function convertTagsToOptions(tags) {
  return (tags || []).map(convertTagToOption);
}

function convertOptionToTag(option) {
  return {
    id: option.value,
    name: option.label,
    color: option.color
  }
}

const StockTagSelect = (props) => {

  const { value: selectedTagIds, readonly, onChange } = props;
  const [loading, setLoading] = React.useState(true);
  const [options, setOptions] = React.useState([]);
  const [selectedOptions, setSelectedOptions] = React.useState([]);

  const loadEntity = async () => {
    try {
      setLoading(true);
      const allTags = await listStockTags();
      const allOptions = convertTagsToOptions(allTags);
      setOptions(allOptions);
      const selectedOptions = allOptions.filter(x => selectedTagIds?.some(tagId => tagId === x.value));
      setSelectedOptions(selectedOptions);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadEntity();
  }, []);

  React.useEffect(() => {
    const selectedOptions = options.filter(x => selectedTagIds.some(tagId => tagId === x.value));
    setSelectedOptions(selectedOptions);
  }, [selectedTagIds]);

  // const handleChange = selected => {
  //   setSelectedOptions(selected);
  //   onChange(selected.map(s => s.key));
  // }

  const handleChange = async (newValue, actionMeta) => {
    switch (actionMeta.action) {
      case 'select-option':
      case 'remove-value':
        updateSelectedOptions(newValue || []);
        break;
      case 'create-option':
      default:
    }
  }

  const handleCreateNew = async (newTagName) => {
    const tagId = uuidv4();
    const newTag = {
      id: tagId,
      name: newTagName,
      color: tinycolor.random().toHexString()
    };
    const newOption = convertTagToOption(newTag);
    try {
      setLoading(true);
      await saveStockTag(newTag);
      setOptions([...options, newOption]);
      updateSelectedOptions([...selectedOptions, newOption]);
    } finally {
      setLoading(false);
    }
  }

  const updateSelectedOptions = (newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
    onChange(newSelectedOptions.map(convertOptionToTag));
  }

  if(readonly) {
    return <>{selectedOptions.map((x, i) => <Tag key={i} color="#3273A4">{x.label}</Tag>)}</>
  }

  return <CreatableSelect
    isMulti
    closeMenuOnSelect={false}
    components={{ Option }}
    isClearable={false}
    isSearchable={true}
    isLoading={loading}
    onChange={handleChange}
    onCreateOption={handleCreateNew}
    value={selectedOptions}
    styles={colourStyles}
    options={options}
  />

  // return (
  //   <SelectStyled
  //     mode="multiple"
  //     allowClear={false}
  //     style={{ minWidth: 200 }}
  //     onChange={handleChange}
  //     disabled={loading}
  //     value={selectedTags}
  //     labelInValue
  //   >
  //     {options.map((t, i) => <Select.Option key={t.id} value={t.id}>
  //       <StockTag color={t.color}>{t.name}</StockTag>
  //     </Select.Option>)}
  //   </SelectStyled>
  // );
};

StockTagSelect.propTypes = {
  // value: PropTypes.string.isRequired,
  value: PropTypes.arrayOf(PropTypes.string),
  readonly: PropTypes.bool,
  onChange: PropTypes.func
};

StockTagSelect.defaultProps = {
  value: [],
  readonly: true,
  onChange: () => { }
};

export default StockTagSelect;
