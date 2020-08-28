import * as core from '@actions/core'
import * as exec from '@actions/exec'
import YAML from 'yaml';
import fs from 'fs'

async function run() {
    const registry = core.getInput("registry", {required: true})
    const imageInputs = core.getInput("images", {required: true})
    const overlay = core.getInput("overlay", {required: true})
    const monitoring = core.getInput("monitoring")

    await setImages(registry, imageInputs, overlay)
    await deploy()
    if (monitoring === "true") {
        await monitorDeployment()
    }

    await exec.exec("kubectl", ["get", "pods", "-n", "mityousee-staging"])
}

const setImages = async (registry, imageInputs, overlay) => {
    const images = imageInputs.split("\n")
    for (const image of images) {
        const imageAndVersion = image.split(":")
        const img = imageAndVersion[0]
        const latest = `${registry}/${img}:latest`
        const current = `${registry}/${image}`

        await runKustomize(overlay, ["edit", "set", "image", `${latest}=${current}`])
    }
}

const deploy = async () => {
    const overlay = core.getInput("overlay");
    const resourceLocation = `${process.cwd()}/resources.yaml`

    await runKustomize(overlay, ["-o", resourceLocation, "build"])
    await exec.exec("kubectl", ["apply", "-f", resourceLocation])
}

const runKustomize = async (overlay, args) => {
    await exec.exec("kustomize", args, {
        cwd: overlay
    })
}

const monitorDeployment = async () => {
    const resourceLocation = `${process.cwd()}/resources.yaml`

    const file = fs.readFileSync(resourceLocation)
    const manifests = YAML.parseAllDocuments(file.toString('utf8'))
    const deployments = manifests.filter((x: any) => x.kind === "Deployment" || x.kind === "StatefulSet" || x.kind === "DaemonSet") as any[];

    for (const deployment of deployments) {
        await exec.exec("kubectl", [
            "rollout",
            "status",
            "-n",
            deployment.metadata.namespace,
            "--timeout",
            "600s",
            `${deployment.kind}/${deployment.metadata.name}`
        ])
    }
}

run().catch(core.setFailed)