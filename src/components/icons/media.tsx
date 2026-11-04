import {
  Camera,
  Image as ImageGlyph,
  Images,
  VideoCamera,
  Sparkle,
  Sparkle as SparklesGlyph,
  Confetti,
  Heart,
} from "@phosphor-icons/react";
import { wrapIcon } from "./base";

export const CameraIcon = wrapIcon(Camera, { displayName: "CameraIcon" });
export const ImageIcon = wrapIcon(ImageGlyph, { displayName: "ImageIcon" });
export const ImagePlusIcon = wrapIcon(Images, { displayName: "ImagePlusIcon" });
export const ImagesIcon = wrapIcon(Images, { displayName: "ImagesIcon" });
export const VideoIcon = wrapIcon(VideoCamera, { displayName: "VideoIcon" });
export const SparkleIcon = wrapIcon(Sparkle, { displayName: "SparkleIcon" });
export const SparklesIcon = wrapIcon(SparklesGlyph, {
  displayName: "SparklesIcon",
});
export const PartyPopperIcon = wrapIcon(Confetti, {
  displayName: "PartyPopperIcon",
});
export const HeartIcon = wrapIcon(Heart, { displayName: "HeartIcon" });
