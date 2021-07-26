import groovy.transform.Field

@Field 
TOOL_FAILED = [false, false, false, false, false]
COMMIT_ID = ''
COMMIT_REPO = ''
SOURCE = 'git-source'
DOCKER_IMAGE = '10.0.0.20:30083/web-app'
WEB_MANAGER_ADDR = 'http://dashboard-backend:3000/api'


//Initialize scanning results of the commit-id
def webHookCheck(String check){
    sh returnStatus: true, script: """
    curl '${WEB_MANAGER_ADDR}/commit?id=${COMMIT_ID}&repo=${COMMIT_REPO}&check=${check}'
    """
}

//Update status of scanning result
def webHookScan(String tool, int ret, int index){
    String status
    if (ret != 0){
        status = 'fail'
        TOOL_FAILED[index] = true
        sh returnStatus: true, script: """
        curl '${WEB_MANAGER_ADDR}/commit?id=${COMMIT_ID}&tool=${tool}&status=${status}'
        """
    } else {
        status = 'pass'
    }
    sh returnStatus: true, script: """
    curl '${WEB_MANAGER_ADDR}/commit?id=${COMMIT_ID}&tool=${tool}&status=${status}'
    """   
}

node ('master') {
    stage('Git clone and setup'){
        COMMIT_ID = env.gitlabAfter
        COMMIT_REPO = env.gitlabSourceRepoName
        git branch: 'develop', credentialsId: 'gitlab-root', url: 'http://gitlab-web/devsecops/a-web-application.git'
        stash includes: '**', name: "${SOURCE}"
        webHookCheck('start')
    }
}


podTemplate(name: 'sonar-scanner-pod', label: 'sonarqube', namespace: 'devsecops', containers: [
    containerTemplate(name: 'sonar-scanner-cli', image: 'sonarsource/sonar-scanner-cli', command: 'cat', ttyEnabled: true),
    ])
{
    def ret
    def projectName = "web-app"
    def sonarHost = "http://sonarqube-web:9000"
    node('sonarqube') {
        stage('Static code analysis') {
            container('sonar-scanner-cli') {
                //Using SonarQube with static analysis of code to detect security vulnerabilities
                unstash "${SOURCE}"
                withSonarQubeEnv('sonarqube-server') {
                    sh "sonar-scanner \
                    -D sonar.projectKey=${projectName} \
                    -D sonar.sources=./src \
                    -D sonar.host.url=${sonarHost} \
                    -D sonar.projectVersion=${COMMIT_ID.substring(0,7)}"
                }
                timeout(time: 5, unit: 'MINUTES') {
                //Checking SonarQube's quality gate
                    ret = waitForQualityGate()
                }    
            }
        }      
    }
    node('master'){
        if (ret.status == 'OK'){
            webHookScan('sonarqube', 0, 0)
        }else{
            webHookScan('sonarqube', 1, 0)
        }
    }
}

podTemplate(name: 'gitleaks-pod', label: 'gitleaks', namespace: 'devsecops', containers: [
    containerTemplate(name: 'gitleaks', image: 'zricethezav/gitleaks', command: 'cat', ttyEnabled: true),
    ],
    volumes: [
    persistentVolumeClaim(claimName: 'pvc-reports', mountPath: '/home/reports', readOnly: false),
    ]) 
{
    int ret
    node('gitleaks') {
        //Using gitleaks to detect sensitive data
        stage('Detecting sensitive data'){
            container('gitleaks'){
                git branch: 'develop', credentialsId: 'gitlab-root', url: 'http://gitlab-web/devsecops/a-web-application.git'
                ret = sh returnStatus: true, script: "gitleaks -p . --config-path=./leaky-repo.toml -f json -o /home/reports/\"${COMMIT_ID}\"-gitleaks.json"               
            }
        }
    }
    node('master'){
        webHookScan('gitleaks', ret, 1)
    }
}

podTemplate(name: 'trivy-pod', label: 'trivy', namespace: 'devsecops', containers: [
    containerTemplate(name: 'trivy', image: 'aquasec/trivy', command: 'cat', ttyEnabled: true),
    ],
    volumes: [
    persistentVolumeClaim(claimName: 'pvc-reports', mountPath: '/home/reports', readOnly: false),
    persistentVolumeClaim(claimName: 'pvc-trivy-cache', mountPath: '/root/.cache', readOnly: false),
    ]) 
{
    int ret
    node('trivy') {
        //Using trivy to detect vulnerabilities of application dependencies
        stage('Dependency vulnerabilities checking'){
            container('trivy'){
                unstash "${SOURCE}"
                ret = sh returnStatus: true, script: "trivy filesystem --exit-code 1 -f json -o /home/reports/\"${COMMIT_ID}\"-trivy.json ./src "          
            }
        }
    }
    node('master'){
        webHookScan('trivy', ret, 2)
    }
}

podTemplate(name: 'docker-in-docker', label: 'docker', namespace: 'devsecops', containers: [
    containerTemplate(name: 'docker', image: 'docker:18-dind', ttyEnabled: true, privileged: true,
                    envVars: [ envVar(key: 'DOCKER_HOST', value: 'tcp://10.0.0.20:2375') ]),
    ])
{
    node('docker') {
        def dockerTag = "${gitlabBranch}-${COMMIT_ID.substring(0,7)}"
        def dockerRegistryAddr = '10.0.0.20:30083'
        //Build the docker image and push it to a docker private registry
        stage('Create staging images') {
            container('docker') {
                unstash "${SOURCE}"
                sh "docker build -t ${DOCKER_IMAGE}-staging:${dockerTag} . "  
                sh "docker tag ${DOCKER_IMAGE}-staging:${dockerTag} ${DOCKER_IMAGE}-staging:latest"
                withCredentials([[$class: 'UsernamePasswordMultiBinding',
                    credentialsId: 'docker-private-login',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASSSWORD']]) {
                    sh "docker login -u ${DOCKER_USER} -p ${DOCKER_PASSSWORD} ${dockerRegistryAddr}"
                }
                sh "docker push ${DOCKER_IMAGE}-staging:${dockerTag}"
                sh "docker push ${DOCKER_IMAGE}-staging:latest"
            }
        }
    }
}


podTemplate(name: 'kubectl-pod', label: 'kubectl', namespace: 'devsecops', containers: [
    containerTemplate(name: 'kubectl', image: 'roffe/kubectl', command: 'cat', ttyEnabled: true),
    ])
{
    node('kubectl') {
        //Deploy the image to staging environment
        stage('Deploy to staging') {
            container('kubectl') {
                unstash "${SOURCE}"
                sh 'kubectl apply -f ./yaml/web-app-staging.yaml'
            }
        }
    }
}

podTemplate(name: 'pytest-pod', label: 'pytest', namespace: 'devsecops', containers: [
    containerTemplate(name: 'pytest', image: 'qnib/pytest', command: 'cat', ttyEnabled: true),
    ])
{
    node('pytest') {
        //Staging tests
        stage('Staging tests') {
            container('pytest') {
                unstash "${SOURCE}"
                ret = sh returnStatus: true, script: "pytest ./tests/test_app.py"
                if (ret != 0){
                    mail to: 'tgbaovn@gmail.com', subject: "[Jenkins] Status of pipeline: ${currentBuild.fullDisplayName}", 
                        body: "[FAILED] Pipeline aborted due to a test failed in pytest # Project: ${COMMIT_REPO} # Commit ID: ${COMMIT_ID} "
                    webHookCheck('end')
                    error "Pipeline aborted due to a test failed in pytest"
                }
            }
        }
    }
}

podTemplate(name: 'zap-pod', label: 'zap', namespace: 'devsecops', containers: [
    containerTemplate(name: 'zap', image: 'owasp/zap2docker-stable', command: 'cat', ttyEnabled: true),
    ],
    volumes: [
    persistentVolumeClaim(claimName: 'pvc-reports', mountPath: '/home/reports', readOnly: false),
    persistentVolumeClaim(claimName: 'pvc-zap-wrk', mountPath: '/zap/wrk/', readOnly: false),
    ]) 
{
    def scanType = 'xss'
    def webAdrr =  'http://10.0.0.20:30030'
    def zapServerAddr= 'zap-server'
    def zapServerPort ='8000'
    int baseline
    int quickscan
    node('zap') {
        //Dynamic scanning with OWASP ZAP for identifying security threats
        stage('Dynamic security testing'){
            container('zap'){
                unstash "${SOURCE}"
                sh 'cp zap-baseline.conf /zap/wrk/'
                baseline = sh returnStatus: true, script: "/zap/zap-baseline.py -t \"${webAdrr}\" -c zap-baseline.conf -J \"${COMMIT_ID}\"-zap-baseline.json"  
                sh "cp /zap/wrk/${COMMIT_ID}-zap-baseline.json /home/reports/"                       
                quickscan = sh returnStatus: true, script: "zap-cli --zap-url \"${zapServerAddr}\" -p \"${zapServerPort}\" quick-scan -s \"${scanType}\" --spider -r \"${webAdrr}\" "
                sh "zap-cli --zap-url ${zapServerAddr} -p ${zapServerPort} report -o /home/reports/${COMMIT_ID}-zap-quickscan.xml -f xml"                                       
            }
        }
    }
    node('master'){
        webHookScan('zap_baseline', baseline, 3)
        webHookScan('zap_quickscan', quickscan, 4)
        webHookCheck('end')
    }    
}

node('master'){
    //Security requirements
    stage('Security gate'){
        for(int i = 0;i < 5;i++) {
            if (TOOL_FAILED[i]){
                mail to: 'tgbaovn@gmail.com', subject: "Status of pipeline: ${currentBuild.fullDisplayName}", 
                    body: "[FAILED] Pipeline aborted due to a failure in a security tool # Project: ${COMMIT_REPO} # Commit ID: ${COMMIT_ID}"
                error "Pipeline aborted due to a failure in a security tool"
            }
        }
    }
}

podTemplate(name: 'docker-in-docker', label: 'docker', namespace: 'devsecops', containers: [
    containerTemplate(name: 'docker', image: 'docker:18-dind', ttyEnabled: true, privileged: true,
                    envVars: [ envVar(key: 'DOCKER_HOST', value: 'tcp://10.0.0.20:2375') ]),
    ])
{
    node('docker') {
        def dockerTag = "${gitlabBranch}-${COMMIT_ID.substring(0,7)}"
        def dockerRegistryAddr = '10.0.0.20:30083'
        //Re tag the docker image
        stage('Create production images') {
            container('docker') {
                sh "docker tag ${DOCKER_IMAGE}-staging:${dockerTag} ${DOCKER_IMAGE}-production:${dockerTag}"
                sh "docker tag ${DOCKER_IMAGE}-production:${dockerTag} ${DOCKER_IMAGE}-production:latest"
                withCredentials([[$class: 'UsernamePasswordMultiBinding',
                    credentialsId: 'docker-private-login',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASSSWORD']]) {
                    sh "docker login -u ${DOCKER_USER} -p ${DOCKER_PASSSWORD} ${dockerRegistryAddr}"
                }
                sh "docker push ${DOCKER_IMAGE}-production:${dockerTag}"
                sh "docker push ${DOCKER_IMAGE}-production:latest"
                sh "docker image rm ${DOCKER_IMAGE}-staging:${dockerTag}"
            }
        }
    }
}

podTemplate(name: 'kubectl-pod', label: 'kubectl', namespace: 'devsecops', containers: [
    containerTemplate(name: 'kubectl', image: 'roffe/kubectl', command: 'cat', ttyEnabled: true),
    ])
{
    node('kubectl') {
        //Deploy the image to production environment
        stage('Deploy to production') {
            container('kubectl') {
                unstash "${SOURCE}"
                sh 'kubectl apply -f ./yaml/web-app-production.yaml'
                mail to: 'tgbaovn@gmail.com', subject: "Status of pipeline: ${currentBuild.fullDisplayName}", 
                    body: "[DEPLOYED] # Project: ${COMMIT_REPO} # Commit ID: ${COMMIT_ID}"
            }
        }
    }
}

