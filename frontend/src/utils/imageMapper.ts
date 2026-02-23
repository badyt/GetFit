import { SERVER_BASE } from "../constants/api";
// Food Images
const foodImages: { [key: string]: any } = {
  "Apple.png": require("../../assets/images/Food/Apple.png"),
  "Banana.png": require("../../assets/images/Food/Banana.png"),
  "Chicken breast.png": require("../../assets/images/Food/Chicken breast.png"),
  "White rice (cooked).png": require("../../assets/images/Food/White rice (cooked).png"),
  "Spinach (cooked).png": require("../../assets/images/Food/Spinach (cooked).png"),
  "Potato (baked).png": require("../../assets/images/Food/Potato (baked).png"),
  "Broccoli (cooked).png": require("../../assets/images/Food/Broccoli (cooked).png"),
  "Salmon (cooked).png": require("../../assets/images/Food/Salmon (cooked).png"),
  "Eggs (boiled).png": require("../../assets/images/Food/Eggs (boiled).png"),
  "Bread (whole wheat).png": require("../../assets/images/Food/Bread (whole wheat).png"),
  "Pasta (cooked).png": require("../../assets/images/Food/Pasta (cooked).png"),
  "Carrots (raw).png": require("../../assets/images/Food/Carrots (raw).png"),
  "Almonds.png": require("../../assets/images/Food/Almonds.png"),
  "Milk (whole).png": require("../../assets/images/Food/Milk (whole).png"),
  "Cheese (cheddar).png": require("../../assets/images/Food/Cheese (cheddar).png"),
  "Beef (lean ground, cooked).png": require("../../assets/images/Food/Beef (lean ground, cooked).png"),
  "Olive oil.png": require("../../assets/images/Food/Olive oil.png"),
  "Avocado.png": require("../../assets/images/Food/Avocado.png"),
  "Yogurt (plain, whole milk).png": require("../../assets/images/Food/Yogurt (plain, whole milk).png"),
  "Oatmeal (cooked).png": require("../../assets/images/Food/Oatmeal (cooked).png"),
  "Oranges.png": require("../../assets/images/Food/Oranges.png"),
  "Grapes.png": require("../../assets/images/Food/Grapes.png"),
  "Tomatoes.png": require("../../assets/images/Food/Tomatoes.png"),
  "Cucumber.png": require("../../assets/images/Food/Cucumber.png"),
  "Pork (loin chop, cooked).png": require("../../assets/images/Food/Pork (loin chop, cooked).png"),
  "Turkey breast (cooked).png": require("../../assets/images/Food/Turkey breast (cooked).png"),
  "Shrimp (cooked).png": require("../../assets/images/Food/Shrimp (cooked).png"),
  "Tofu (firm, raw).png": require("../../assets/images/Food/Tofu (firm, raw).png"),
  "Lentils (cooked).png": require("../../assets/images/Food/Lentils (cooked).png"),
  "Chickpeas (cooked).png": require("../../assets/images/Food/Chickpeas (cooked).png"),
  "Peanut butter.png": require("../../assets/images/Food/Peanut butter.png"),
  "Honey.png": require("../../assets/images/Food/Honey.png"),
  "Quinoa (cooked).png": require("../../assets/images/Food/Quinoa (cooked).png"),
  "Sweet potato (baked).png": require("../../assets/images/Food/Sweet potato (baked).png"),
  "Corn (cooked).png": require("../../assets/images/Food/Corn (cooked).png"),
  "Blueberries.png": require("../../assets/images/Food/Blueberries.png"),
  "Strawberries.png": require("../../assets/images/Food/Strawberries.png"),
  "Pineapple.png": require("../../assets/images/Food/Pineapple.png"),
  "Raspberries.png": require("../../assets/images/Food/Raspberries.png"),
};

// Exercise Images
const exerciseImages: { [key: string]: any } = {
  "shoulder-press.jpg": require("../../assets/images/Exercises/shoulder-press.jpg"),
  "lateral-raises.jpg": require("../../assets/images/Exercises/lateral-raises.jpg"),
  "arnold-press.jpg": require("../../assets/images/Exercises/arnold-press.jpg"),
  "front-raises.jpg": require("../../assets/images/Exercises/front-raises.jpg"),
  "reverse-fly.jpg": require("../../assets/images/Exercises/reverse-fly.jpg"),
  "upright-row.jpg": require("../../assets/images/Exercises/upright-row.jpg"),
  "face-pull.jpg": require("../../assets/images/Exercises/face-pull.jpg"),
  "overhead-press.jpg": require("../../assets/images/Exercises/overhead-press.jpg"),
  "cable-lateral-raises.jpg": require("../../assets/images/Exercises/cable-lateral-raises.jpg"),
  "machine-shoulder-press.jpg": require("../../assets/images/Exercises/machine-shoulder-press.jpg"),
  "squat.jpg": require("../../assets/images/Exercises/squat.jpg"),
  "lunge.jpg": require("../../assets/images/Exercises/lunge.jpg"),
  "leg-press.jpg": require("../../assets/images/Exercises/leg-press.jpg"),
  "deadlift.jpg": require("../../assets/images/Exercises/deadlift.jpg"),
  "leg-curl.jpg": require("../../assets/images/Exercises/leg-curl.jpg"),
  "leg-extension.jpg": require("../../assets/images/Exercises/leg-extension.jpg"),
  "calf-raise.jpg": require("../../assets/images/Exercises/calf-raise.jpg"),
  "bulgarian-split-squat.jpg": require("../../assets/images/Exercises/bulgarian-split-squat.jpg"),
  "step-ups.jpg": require("../../assets/images/Exercises/step-ups.jpg"),
  "hack-squat.jpg": require("../../assets/images/Exercises/hack-squat.jpg"),
  "bench-press.jpg": require("../../assets/images/Exercises/bench-press.jpg"),
  "incline-bench-press.jpg": require("../../assets/images/Exercises/incline-bench-press.jpg"),
  "decline-bench-press.jpg": require("../../assets/images/Exercises/decline-bench-press.jpg"),
  "chest-fly.jpg": require("../../assets/images/Exercises/chest-fly.jpg"),
  "push-ups.jpg": require("../../assets/images/Exercises/push-ups.jpg"),
  "cable-crossovers.jpg": require("../../assets/images/Exercises/cable-crossovers.jpg"),
  "dips.jpg": require("../../assets/images/Exercises/dips.jpg"),
  "dumbbell-pullover.jpg": require("../../assets/images/Exercises/dumbbell-pullover.jpg"),
  "pull-ups.jpg": require("../../assets/images/Exercises/pull-ups.jpg"),
  "lat-pulldown.jpg": require("../../assets/images/Exercises/lat-pulldown.jpg"),
  "bent-over-row.jpg": require("../../assets/images/Exercises/bent-over-row.jpg"),
  "dumbbell-row.jpg": require("../../assets/images/Exercises/dumbbell-row.jpg"),
  "t-bar-row.jpg": require("../../assets/images/Exercises/t-bar-row.jpg"),
  "seated-cable-row.jpg": require("../../assets/images/Exercises/seated-cable-row.jpg"),
  "back-extension.jpg": require("../../assets/images/Exercises/back-extension.jpg"),
  "inverted-row.jpg": require("../../assets/images/Exercises/inverted-row.jpg"),
  "bicep-curl.jpg": require("../../assets/images/Exercises/bicep-curl.jpg"),
  "hammer-curl.jpg": require("../../assets/images/Exercises/hammer-curl.jpg"),
  "concentration-curl.jpg": require("../../assets/images/Exercises/concentration-curl.jpg"),
  "preacher-curl.jpg": require("../../assets/images/Exercises/preacher-curl.jpg"),
  "cable-curl.jpg": require("../../assets/images/Exercises/cable-curl.jpg"),
  "chin-ups.jpg": require("../../assets/images/Exercises/chin-ups.jpg"),
  "ez-bar-curl.jpg": require("../../assets/images/Exercises/ez-bar-curl.jpg"),
  "incline-dumbbell-curl.jpg": require("../../assets/images/Exercises/incline-dumbbell-curl.jpg"),
  "spider-curl.jpg": require("../../assets/images/Exercises/spider-curl.jpg"),
  "zottman-curl.jpg": require("../../assets/images/Exercises/zottman-curl.jpg"),
  "tricep-pushdown.jpg": require("../../assets/images/Exercises/tricep-pushdown.jpg"),
  "overhead-tricep-extension.jpg": require("../../assets/images/Exercises/overhead-tricep-extension.jpg"),
  "skull-crushers.jpg": require("../../assets/images/Exercises/skull-crushers.jpg"),
  "close-grip-bench-press.jpg": require("../../assets/images/Exercises/close-grip-bench-press.jpg"),
  "diamond-push-ups.jpg": require("../../assets/images/Exercises/diamond-push-ups.jpg"),
  "tricep-kickbacks.jpg": require("../../assets/images/Exercises/tricep-kickbacks.jpg"),
  "cable-kickback.jpg": require("../../assets/images/Exercises/cable-kickback.jpg"),
  "crunches.jpg": require("../../assets/images/Exercises/crunches.jpg"),
  "leg-raises.jpg": require("../../assets/images/Exercises/leg-raises.jpg"),
  "russian-twists.jpg": require("../../assets/images/Exercises/russian-twists.jpg"),
  "mountain-climbers.jpg": require("../../assets/images/Exercises/mountain-climbers.jpg"),
  "hanging-leg-raise.jpg": require("../../assets/images/Exercises/hanging-leg-raise.jpg"),
  "flutter-kicks.jpg": require("../../assets/images/Exercises/flutter-kicks.jpg"),
  "hip-thrust.jpg": require("../../assets/images/Exercises/hip-thrust.jpg"),
  "glute-bridge.jpg": require("../../assets/images/Exercises/glute-bridge.jpg"),
  "romanian-deadlift.jpg": require("../../assets/images/Exercises/romanian-deadlift.jpg"),
  "single-leg-deadlift.jpg": require("../../assets/images/Exercises/single-leg-deadlift.jpg"),
  "seated-calf-raise.jpg": require("../../assets/images/Exercises/seated-calf-raise.jpg"),
  "front-squat.jpg": require("../../assets/images/Exercises/front-squat.jpg"),
};

export const getFoodImage = (imageName: string | null) => {
  if (!imageName) return null;
  if (foodImages[imageName]) return foodImages[imageName];
  // If imageName looks like a backend upload path, return as remote image
  if (imageName.startsWith("/uploads/")) {
    return { uri: SERVER_BASE + imageName };
  }
  // If imageName is already a full URL
  if (imageName.startsWith("http://") || imageName.startsWith("https://")) {
    return { uri: imageName };
  }
  return null;
};

export const getExerciseImage = (imageName: string | null) => {
  if (!imageName) return null;
  if (exerciseImages[imageName]) return exerciseImages[imageName];
  if (imageName.startsWith("/uploads/")) {
    return { uri: SERVER_BASE + imageName };
  }
  if (imageName.startsWith("http://") || imageName.startsWith("https://")) {
    return { uri: imageName };
  }
  return null;
};
