import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-[#1F2A44] text-[#F4F3EF] font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
