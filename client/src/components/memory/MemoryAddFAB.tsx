import { Plus } from "lucide-react";
import { FAB } from "../ui/FAB";

interface MemoryAddFABProps {
  onClick: () => void;
}

export function MemoryAddFAB({ onClick }: MemoryAddFABProps) {
  return (
    <FAB
      onClick={onClick}
      position="bottom-right"
      size="default"
      className="shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 safe-area-inset-bottom"
      aria-label="Add Memory"
      title="Add Memory"
    >
      <Plus className="h-6 w-6" />
    </FAB>
  );
}