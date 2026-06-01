import { useAssetUrl } from '../hooks/useAssetUrl';

interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  url?: string;
}

export function AssetImage({ src, url, className, alt = "", ...props }: AssetImageProps) {
  const targetUrl = url || src;
  const assetUrl = useAssetUrl(targetUrl);
  if (!assetUrl) return null;
  return <img src={assetUrl} alt={alt} className={className} {...props} />;
}
