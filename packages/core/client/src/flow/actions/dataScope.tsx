/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import {
  defineAction,
  MultiRecordResource,
  tExpr,
  useFlowSettingsContext,
  useFlowViewContext,
} from '@nocobase/flow-engine';
import type { MetaTreeNode } from '@nocobase/flow-engine';
import { isEmptyFilter } from '@nocobase/utils/client';
import React from 'react';
import { FilterGroup, VariableFilterItem } from '../components/filter';
import { FieldModel } from '../models/base/FieldModel';
import { normalizeDataScopeFilter } from './dataScopeFilter';
import { ensureFormValueDrivenDataScopeClear } from './dataScopeFormValueClear';
import { mergeDataScopeRightMetaTree } from './dataScopeMetaTree';

async function resolveMetaTree(raw: MetaTreeNode[] | (() => MetaTreeNode[] | Promise<MetaTreeNode[]>) | undefined) {
  if (!raw) return [];
  const nodes = Array.isArray(raw) ? raw : await raw();
  return Array.isArray(nodes) ? nodes : [];
}

export const dataScope = defineAction({
  name: 'dataScope',
  title: tExpr('Data scope'),
  uiMode: {
    type: 'dialog',
    props: {
      width: 800,
    },
  },
  uiSchema: {
    filter: {
      type: 'object',
      'x-decorator': 'FormItem',
      'x-component': function Component(props) {
        const flowContext = useFlowSettingsContext<FieldModel>();
        const viewContext = useFlowViewContext();
        const rightMetaTree = async () => {
          const base = await resolveMetaTree(viewContext?.getPropertyMetaTree?.());
          const override = await resolveMetaTree(flowContext.model?.context?.getPropertyMetaTree?.());
          return mergeDataScopeRightMetaTree(base, override);
        };
        return (
          <FilterGroup
            value={props.value}
            FilterItem={(p) => (
              <VariableFilterItem {...p} model={flowContext.model} rightAsVariable rightMetaTree={rightMetaTree} />
            )}
          />
        );
      },
    },
  },
  defaultParams(ctx) {
    return {
      filter: { logic: '$and', items: [] },
    };
  },
  useRawParams: true,
  async handler(ctx, params) {
    // @ts-ignore
    const resource = ctx.model?.resource as MultiRecordResource;
    if (!resource) {
      return;
    }

    const resolvedFilter = await ctx.resolveJsonTemplate(params.filter);
    const filter = normalizeDataScopeFilter(params.filter, resolvedFilter);

    ensureFormValueDrivenDataScopeClear(ctx as any, params.filter);

    if (isEmptyFilter(filter)) {
      resource.removeFilterGroup(ctx.model.uid);
    } else {
      resource.addFilterGroup(ctx.model.uid, filter);
    }
  },
});
