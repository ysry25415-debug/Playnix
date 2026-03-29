const BEN10_LOADER_IMAGE =
  "https://i.pinimg.com/736x/87/4d/10/874d10c2d9e58cd8c45a5f42545b00a3.jpg";

type PageLoaderProps = {
  overlayClassName?: string;
  label?: string;
  hint?: string;
};

export function PageLoader({
  overlayClassName = "page-loader-overlay",
  label = "Loading BEN10...",
  hint = "Please wait while the next screen gets ready.",
}: PageLoaderProps) {
  return (
    <div className={overlayClassName} role="status" aria-live="polite" aria-busy="true">
      <div className="page-loader">
        <div className="page-loader__spinner">
          <img src={BEN10_LOADER_IMAGE} alt="BEN10 loading" />
        </div>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
    </div>
  );
}
