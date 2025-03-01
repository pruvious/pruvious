<template>
  <Showcase>
    <PUITree
      v-model="tree"
      v-model:highlightedItem="highlightedItem"
      v-model:selectedItems="selectedItems"
      :size="state.size"
      :source="{ root: vdom, props: { id: 'id', children: 'children' } }"
      class="pui-tree"
    >
      <template #item-label="{ item }">{{ item.label }} ({{ item.id }})</template>

      <template #item-icon="{ item }">
        <Icon v-if="item.source.nodeName === 'HEADER'" mode="svg" name="tabler:layout-navbar" />
        <Icon v-else-if="item.source.nodeName === 'IMG'" mode="svg" name="tabler:photo" />
        <Icon v-else-if="item.source.nodeName === 'UL'" mode="svg" name="tabler:list" />
        <Icon v-else-if="item.source.nodeName === 'LI'" mode="svg" name="tabler:playlist-add" />
        <Icon v-else-if="item.source.nodeName === 'A'" mode="svg" name="tabler:link" />
        <Icon v-else mode="svg" name="tabler:typography" />
      </template>
    </PUITree>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import { isDefined } from '@pruvious/utils'
import type { PUITreeItemModel } from '../../components/PUITreeItem.vue'

interface VNode {
  id: string
  nodeName?: string
  attrs?: Record<string, any>
  children?: VNode[]
  text?: string
}

const vdom: Ref<VNode[]> = ref([
  {
    id: 'header',
    nodeName: 'HEADER',
    attrs: {},
    children: [
      { id: 'logo', nodeName: 'IMG', attrs: { src: 'logo.svg' } },
      {
        id: 'nav',
        nodeName: 'UL',
        attrs: {},
        children: [
          {
            id: 'nav-item-1',
            nodeName: 'LI',
            attrs: {},
            children: [
              {
                id: 'nav-link-1',
                nodeName: 'A',
                attrs: { href: '/home' },
                children: [{ id: 'nav-text-1', text: 'Home' }],
              },
            ],
          },
          {
            id: 'nav-item-2',
            nodeName: 'LI',
            attrs: {},
            children: [
              {
                id: 'nav-link-2',
                nodeName: 'A',
                attrs: { href: '/about' },
                children: [{ id: 'nav-text-2', text: 'About' }],
              },
            ],
          },
          {
            id: 'nav-item-3',
            nodeName: 'LI',
            attrs: {},
            children: [
              {
                id: 'nav-link-3',
                nodeName: 'A',
                attrs: { href: '/contact' },
                children: [{ id: 'nav-text-3', text: 'Contact' }],
              },
            ],
          },
        ],
      },
    ],
  },
])

const treeMapper: PUITreeMapper<VNode> = (vdom) =>
  vdom.map((node) => ({
    id: node.id,
    source: node,
    label: node.nodeName ?? node.text,
    nestable: isDefined(node.children),
    children: isDefined(node.children) ? treeMapper(node.children) : undefined,
    expanded: isDefined(node.children) ? true : undefined,
    draggable: true,
    droppable: true,
    movable: true,
  }))

const { tree } = puiTree(vdom.value, treeMapper)

const state = useShowcase()
const selectedItems = ref<PUITreeItemModel<VNode>[]>([])
const highlightedItem = ref<PUITreeItemModel<VNode> | undefined>(undefined)
</script>

<style scoped>
.pui-tree {
  width: 16rem;
  height: 16rem;
}
</style>
