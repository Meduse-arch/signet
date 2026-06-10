import { useAssetUrl } from '../hooks/useAssetUrl';
import { Icons } from './ui/Icons';

interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
 src?: string;
 url?: string;
}

export function AssetImage({ src, url, className, alt = "", ...props }: AssetImageProps) {
 const targetUrl = url || src;
 const assetUrl = useAssetUrl(targetUrl);
 
 if (targetUrl && targetUrl.startsWith('asset://') && !assetUrl) {
   return (
     <div className={`relative flex items-center justify-center bg-[#0D0D0F] overflow-hidden ${className || ''}`}>
       <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none z-[1]" />
       <div className="absolute inset-0 bg-vignette pointer-events-none z-[2]" />
       <Icons.Loader2 className="w-6 h-6 text-silver-bright opacity-30 animate-spin z-10" />
     </div>
   );
 }

 if (!assetUrl) return null;
 return <img src={assetUrl} alt={alt} className={className} {...props} />;
}
