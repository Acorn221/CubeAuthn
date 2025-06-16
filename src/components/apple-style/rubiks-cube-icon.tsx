import React from "react";
// @ts-expect-error https://www.nytimes.com/2016/08/06/arts/this-is-fine-meme-dog-fire.html
import icon from "data-url:~/assets/icon.png"
import { cn } from "~/lib/utils"

const RubiksCubeIcon: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <img src={icon} alt="Rubik's Cube Icon" className={cn("size-10", className)} />
  );
};

export default RubiksCubeIcon;