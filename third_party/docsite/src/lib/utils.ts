/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { MarkdownHeading } from "astro";
import { getCollection } from "astro:content";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type {
  DocsEntry,
  HeadingHierarchy,
  MenuItem,
  MenuItemWithDraft,
} from "@/lib/types";

import { side_nav_menu_order } from "config";

// for shadcn components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fetch the collection with type
const docs: DocsEntry[] = await getCollection("docs");

// Helper function to capitalize the first letter of a string
export const capitalizeFirstLetter = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Function to build nested menu structure
function buildMenu(items: DocsEntry[]): MenuItem[] {
  const menu: MenuItemWithDraft[] = [];

  // Create a map to quickly look up the order of top-level items
  const orderMap = new Map(
    side_nav_menu_order.map((item, index) => [item, index]),
  );

  // Helper function to sort top-level items
  function sortTopLevel(items: MenuItemWithDraft[]): MenuItemWithDraft[] {
    const sortedItems = items.slice().sort((a, b) => {
      const aIndex = orderMap.get(a.slug) ?? Infinity;
      const bIndex = orderMap.get(b.slug) ?? Infinity;
      return aIndex - bIndex;
    });
    return sortedItems;
  }

  items.forEach((item) => {
    const parts = item.slug.split("/"); // Split slug into parts
    let currentLevel = menu;

    // Traverse the menu structure based on folder depth
    parts.forEach((part: string, index: number) => {
      let existingItem = currentLevel.find(
        (i) => i.slug === parts.slice(0, index + 1).join("/"),
      );

      if (!existingItem) {
        existingItem = {
          // Use title from item.data if it's the last part
          title:
            index === parts.length - 1
              ? capitalizeFirstLetter(item.data.title || "")
              : capitalizeFirstLetter(part),
          slug: parts.slice(0, index + 1).join("/"),
          draft: item.data.draft,
          children: [],
          sort_order: item.data.sort_order,
        };
        currentLevel.push(existingItem);
      } else {
        // Update title if necessary
        if (index === parts.length - 1) {
          existingItem.title = capitalizeFirstLetter(item.data.title || "");
        }
      }

      currentLevel = existingItem.children;
    });
  });

  // Sort top-level items based on menu_order
  const topLevelMenu = sortTopLevel(menu);

  return topLevelMenu;
}

// Function to flatten nested menu structure into a linear array
function flattenMenu(
  menu: { title?: string; slug: string; children: any[] }[],
) {
  const flatMenu: { title?: string; slug: string }[] = [];

  const traverse = (
    items: { title?: string; slug: string; children: any[] }[],
  ) => {
    items.forEach((item) => {
      flatMenu.push({ title: item.title, slug: item.slug });
      if (item.children.length > 0) {
        traverse(item.children);
      }
    });
  };

  traverse(menu);

  return flatMenu;
}

export const menu = buildMenu(docs);
export const flatMenu = flattenMenu(menu);

// Function to build breadcrumb structure
export function buildBreadcrumbs(
  slug: string,
): { title: string; link: string }[] {
  const parts = slug.split("/");
  const breadcrumbs: { title: string; link: string }[] = [];
  let currentPath = "";

  parts.forEach((part, index) => {
    if (part) {
      currentPath += `/${part}`;
      breadcrumbs.push({
        title: part,
        link: `${currentPath}`,
      });
    }
  });

  return breadcrumbs;
}

// create headings for ToC
export function createHeadingHierarchy(headings: MarkdownHeading[]) {
  const topLevelHeadings: HeadingHierarchy[] = [];

  headings.forEach((heading) => {
    const h = {
      ...heading,
      subheadings: [],
    };

    if (h.depth >= 2) {
      topLevelHeadings.push(h);
    } else {
      let parent = topLevelHeadings[topLevelHeadings.length - 1];
      if (parent) {
        parent.subheadings.push(h);
      }
    }
  });

  return topLevelHeadings;
}
