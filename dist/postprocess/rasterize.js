import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { resvgBaseOptions } from "../resvg-fonts.js";
function withWhiteBackground(svg) {
    if (/<rect[^>]*id="rmp-export-bg"/.test(svg))
        return svg;
    return svg.replace(/(<svg[^>]*>)/, '$1<rect id="rmp-export-bg" x="-100000" y="-100000" width="200000" height="200000" fill="#ffffff"/>');
}
export async function rasterizeSvg(options) {
    let svg = readFileSync(options.svgPath, "utf-8");
    if (options.whiteBackground) {
        svg = withWhiteBackground(svg);
    }
    const resvg = new Resvg(svg, {
        ...resvgBaseOptions(),
        fitTo: { mode: "zoom", value: options.scale },
        background: options.whiteBackground ? "white" : undefined,
    });
    const pngData = resvg.render().asPng();
    if (options.format === "png") {
        writeFileSync(options.outputPath, pngData);
        return;
    }
    await sharp(pngData).webp().toFile(options.outputPath);
}
