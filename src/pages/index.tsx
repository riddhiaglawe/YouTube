import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { Suspense, useState } from "react";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  return (
    <main className="flex-1 p-4">
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid selectedCategory={selectedCategory} />
      </Suspense>
    </main>
  );
}
