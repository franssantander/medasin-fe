import { domMax } from "motion/react";

// Loaded after the page is interactive, so animation features stay out of the first bundle.
// domMax rather than domAnimation: the product preview can be dragged.
export default domMax;
