import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical } from "lucide-react";

interface Project {
  id: string;
  title: string;
  protocol_number: string | null;
}

interface GlobalStudySelectorProps {
  value: string;
  onChange: (value: string) => void;
  showAllOption?: boolean;
  showGeneralOption?: boolean;
  generalValue?: string;
  generalLabel?: string;
}

export default function GlobalStudySelector({
  value,
  onChange,
  showAllOption = false,
  showGeneralOption = false,
  generalValue = "__general__",
  generalLabel = "General (no project)",
}: GlobalStudySelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, protocol_number")
        .order("title");
      setProjects(data || []);
      if (!showAllOption && !value && data && data.length > 0) {
        onChange(data[0].id);
      }
    };
    load();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <FlaskConical className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[260px]">
          <SelectValue placeholder="Select study" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Studies</SelectItem>}
          {showGeneralOption && <SelectItem value={generalValue}>{generalLabel}</SelectItem>}
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.protocol_number || p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
