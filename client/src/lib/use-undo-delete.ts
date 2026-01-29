import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Undo2 } from "lucide-react";

type UndoDeleteOptions = {
  key: string;
  label: string;
  onDelete: () => void;
  description?: string;
};

export const useUndoDelete = () => {
  const { toast } = useToast();
  const pendingRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const scheduleDelete = ({ key, label, onDelete, description }: UndoDeleteOptions) => {
    if (pendingRef.current[key]) {
      clearTimeout(pendingRef.current[key]);
    }

    const timeoutId = setTimeout(() => {
      onDelete();
      delete pendingRef.current[key];
    }, 5000);

    pendingRef.current[key] = timeoutId;

    toast({
      title: "Delete scheduled",
      description: description || `${label} will be deleted in 5 seconds.`,
      action: (
        <ToastAction
          altText="Undo delete"
          onClick={() => {
            clearTimeout(timeoutId);
            delete pendingRef.current[key];
            toast({
              title: "Delete canceled",
              description: `${label} was not deleted.`,
            });
          }}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </ToastAction>
      ),
    });
  };

  return { scheduleDelete };
};
