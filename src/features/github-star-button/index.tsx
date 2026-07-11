import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GithubStarButton() {
  return (
    <Button size="sm">
      <Star className="mr-1" size={16} /> Star Github
    </Button>
  );
}
