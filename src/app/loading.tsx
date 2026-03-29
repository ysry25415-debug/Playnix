import { PageLoader } from "@/components/shared/page-loader";

export default function Loading() {
  return (
    <PageLoader
      label="Loading the page..."
      hint="The next BEN10 screen will appear as soon as the data is ready."
    />
  );
}
