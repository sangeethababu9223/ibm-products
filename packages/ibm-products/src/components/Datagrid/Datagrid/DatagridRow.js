/**
 * Copyright IBM Corp. 2020, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { DataTable, SkeletonText } from 'carbon-components-react';
import { px } from '@carbon/layout';
import cx from 'classnames';
import { selectionColumnId } from '../common-column-ids';
import { pkg, carbon } from '../../../settings';

const blockClass = `${pkg.prefix}--datagrid`;

const { TableRow, TableCell } = DataTable;

const rowHeights = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

// eslint-disable-next-line react/prop-types
const DatagridRow = (datagridState) => {
  const {
    row,
    rowSize,
    withNestedRows,
    prepareRow,
    key,
    tableId,
    withExpandedRows,
    withMouseHover,
    setMouseOverRowIndex,
  } = datagridState;

  const getVisibleNestedRowCount = ({ isExpanded, subRows }) => {
    let size = 0;
    if (isExpanded && subRows) {
      size += subRows.length;
      subRows.forEach((child) => {
        size += getVisibleNestedRowCount(child);
      });
    }
    return size;
  };

  const hoverHandler = (event) => {
    if (!withNestedRows) {
      return;
    }
    const subRowCount = getVisibleNestedRowCount(row);
    const totalNestedRowIndicatorHeight = px(subRowCount * rowHeights[rowSize]);
    const hoverRow = event.target.closest(
      `.${blockClass}__carbon-row-expanded`
    );
    hoverRow?.classList.add(`${blockClass}__carbon-row-expanded-hover-active`);
    const rowExpanderButton = hoverRow?.querySelector(
      `.${blockClass}__row-expander`
    );
    const rowSizeValue = rowSize || 'lg';
    hoverRow?.style?.setProperty(
      `--${blockClass}--indicator-height`,
      totalNestedRowIndicatorHeight
    );
    hoverRow?.style?.setProperty(
      `--${blockClass}--row-height`,
      px(rowHeights[rowSizeValue])
    );
    hoverRow?.style?.setProperty(
      `--${blockClass}--indicator-offset-amount`,
      px(rowExpanderButton?.offsetLeft || 0)
    );
  };

  const focusRemover = () => {
    const elements = document.querySelectorAll(
      `#${tableId} .${blockClass}__carbon-row-expanded`
    );
    elements.forEach((el) => {
      el.classList.remove(`${blockClass}__carbon-row-expanded-hover-active`);
    });
  };

  const renderExpandedRow = () => {
    if (row.isExpanded) {
      prepareRow(row);
      return row?.RowExpansionRenderer?.({ ...datagridState, row });
    }
    return null;
  };

  const handleMouseLeave = (event) => {
    if (withMouseHover) {
      setMouseOverRowIndex(null);
    }
    const hoverRow = event.target.closest(
      `.${blockClass}__carbon-row-expanded`
    );
    hoverRow?.classList.remove(
      `${blockClass}__carbon-row-expanded-hover-active`
    );
  };

  const handleOnKeyUp = (event) => {
    if (!withNestedRows) {
      return;
    }
    if (event.key === 'Enter' || event.key === 'Space') {
      focusRemover();
      hoverHandler(event);
    }
  };

  const { className } = row.getRowProps();

  const rowClassNames = cx(`${blockClass}__carbon-row`, {
    [`${blockClass}__carbon-row-expanded`]: row.isExpanded,
    [`${blockClass}__carbon-row-expandable`]: row.canExpand,
    [`${carbon.prefix}--data-table--selected`]: row.isSelected,
  });

  const setAdditionalRowProps = () => {
    if (withNestedRows || withExpandedRows) {
      return {
        'data-nested-row-id': row.id,
      };
    }
    return {};
  };

  return (
    <React.Fragment key={key}>
      <TableRow
        {...row.getRowProps({ role: undefined })}
        className={cx(rowClassNames, className)}
        key={row.id}
        onMouseEnter={hoverHandler}
        onMouseLeave={handleMouseLeave}
        onFocus={hoverHandler}
        onBlur={focusRemover}
        onKeyUp={handleOnKeyUp}
        {...setAdditionalRowProps()}
      >
        {row.cells.map((cell, index) => {
          const cellProps = cell.getCellProps({ role: undefined });
          const { children, ...restProps } = cellProps;
          const content = children || (
            <>
              {!row.isSkeleton && cell.render('Cell')}
              {row.isSkeleton && <SkeletonText />}
            </>
          );
          if (cell?.column?.id === selectionColumnId) {
            // directly render component without the wrapping TableCell
            return cell.render('Cell', { key: cell.column.id });
          }
          return (
            <TableCell
              className={cx(`${blockClass}__cell`, {
                [`${blockClass}__expandable-row-cell`]:
                  row.canExpand && index === 0,
                [`${blockClass}__expandable-row-cell--is-expanded`]:
                  row.isExpanded && index === 0,
              })}
              {...restProps}
              key={cell.column.id}
            >
              {content}
            </TableCell>
          );
        })}
      </TableRow>
      {renderExpandedRow()}
    </React.Fragment>
  );
};

export default DatagridRow;
