export interface RmpServerOptions {
    repository: string;
    ref: string;
    cacheRoot: string;
    host?: string;
}
export interface RmpServerHandle {
    baseUrl: string;
    stop: () => void;
}
export declare function startRmpServer(options: RmpServerOptions): Promise<RmpServerHandle>;
