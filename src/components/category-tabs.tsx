"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

interface CategoryTabsProps {
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export default function CategoryTabs({
  selectedCategory = "All",
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {categories.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? "default" : "secondary"}
          className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium"
          onClick={() => onSelectCategory?.(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
