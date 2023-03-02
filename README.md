# pokerbaazi-school-app

### Folder Structure

```
.
├── README.md
├── serverless 					- script for executing functions and deployment
├── controllers 				- APIs for the content management and user progress
├── handlers   					- NodejS App
├── utils         				- Contains utility files
```

## APIs list

```
1.  Get Courses
    Route: <base_url>/<stage>/v1/courses
    Description: to get the details of courses
2.  Get Chapters
    Route: <base_url>/<stage>/v1/chapters
    Description: to get the details of chapters
3.  Get Chapters in a course
    Route: <base_url>/<stage>/v1/courses/chapters
    Description: to get the details of all the chapters which belongs to a particular course
4.  Get details of a Free Quiz
    Route: <base_url>/<stage>/v1/freequizzes
    Description: to get the details of a freequiz
5.  Get Free Videos
    Route: <base_url>/<stage>/v1/freevideos
    Description: to get the details of freevideos
6.  Get Feeds
    Route: <base_url>/<stage>/v1/feeds
    Description: to get the details of feeds
7.  Get LiveStreams
    Route: <base_url>/<stage>/v1/livestreams
    Description: to get the details of livestreams
8.  Get Banners
    Route: <base_url>/<stage>/v1/banners
    Description: to get the details of banners
9.  Get Homepage
    Route: <base_url>/<stage>/v1/homepage
    Description: to get the details of homepage
10. Post User Progress
    Route: <base_url>/<stage>/v1/postuserprogress
    Description: to post the progress
11. Get user progress
    Route: <base_url>/<stage>/v1/userprogress
    Description: to get the progress of a user
12. Get user Progress for Course
    Route: <base_url>/<stage>/v1/courseprogress
    Description: to get the progress of a course of a user
13. Get user Progress for Chapter
    Route: <base_url>/<stage>/v1/chapterprogress
    Description: to get the progress of a chapter of a user
14. Get user Progress for Quiz
    Route: <base_url>/<stage>/v1/quizprogress
    Description: to get the progress of a quiz of a user
15. Get user Progress for Video
    Route: <base_url>/<stage>/v1/videoprogress
    Description: to get the progress of a video of a user
16. Get a Quiz of a Chapter
    Route: <base_url>/<stage>/v1/chapters/quizzes
    Description: to get the details of a quiz of a chapter
17. Get details of a Course
    Route: <base_url>/<stage>/v1/coursedetails
    Description: to get the details of a course
18. Get List of Free Quiz
    Route: <base_url>/<stage>/v1/freequiz
    Description: to get the list of all freequiz
19. Post Feedback
    Route: <base_url>/<stage>/v1/postuserfeedback
    Description: to post the feedback
20. Get Feedback
    Route: <base_url>/<stage>/v1/getuserfeedback
    Description: to get the feedback
21. Get MyLearning
    Route: <base_url>/<stage>/v1/getmylearning
    Description: to get the my learning of a user
22. Post Last Seen video/quiz
    Route: <base_url>/<stage>/v1/postlastseen
    Description: to post the last seen video/quiz of a user
23. Get Last Seen video/quiz
    Route: <base_url>/<stage>/v1/getlastseen
    Description: to get the last seen video/quiz of a user
```

## Mongo Triggers

```
Follow this article for it: 'https://montumodi.medium.com/serverless-change-notifier-using-mongodb-realm-stitch-triggers-and-aws-eventbridge-927a61d43f56'
```

1. Login to mongodb atlas.
2. Complete all the steps on mongodb atlas.
3. Go to AWS eventbridge.
    a. Click on Partner event sources.
    b. Select the record and click on Associate with event bus.
    c. Once you click on associate, it will create a new custom bus for you. Click on Event bus in left    hand section to verify it under custom event bus section.
    d. Next click on Rules and select the event bus created above from the drop down and click Create Rule.
    e. Select Pre-defined pattern by service inside Event matching pattern and select service partners as the service providers and mongodb as the service name.
    f. Select lambda function as the target and select the lambda function name from the dropdown menu.
    g. Click create.

## AWS Secret manager Configuration

1.  In SecretsManager , store a new secret by providing secretName corrosponding to the environment

```
    Secretname: dev/mongo // This is for dev environment
    Secretname: qa/mongo // This is for qa environment
    Secretname: prod/mongo // This is for prod environment

```

    Note: If you will give a different name to your secret, please add/update the same in secret-manager.js file.

2.  Store the below secrets
    ```
    {
    "MongoConnectionString": <Enter Mongo Connection String here>,
    "DatabaseName": <Enter Database Name here>,
    "FirebaseEndpoint": <Enter endpoint for firebase token validation>,
    "DeploymentBucket": <Enter Deployment Bucket Name here>,
    "SecurityGroupID": <Enter Secrurity Group Id here>,
    "PrivateSubnetID1": <Enter subnetID here>,
    "PrivateSubnetID2": <Enter subnetID here>
    "VpcID": <Enter VPC here>,
    "Host":<Enter Host here>,
    "Port":<Enter Strapi application port here{1337}>,
    "DatabaseHost":<Enter DatabaseHost here>,
    "DatabaseSRV":<Enter database SRV{true}>,
    "DatabasePort":<Enter database port here {27017}>,
    "DatabaseUserName":<Enter database Username here>,
    "DatabasePassword":<Enter database Password here>,
    "AuthenticationDatabase":<Enter Authentication database here>,
    "DatabaseSSL":<Enter database ssl here {true}>,
    "EBInstanceCapacity":<Enter eb instance capacity here {>=t3.medium}>,
    "PublicSubnetID1":<Enter public subnetID here>,
    "PublicSubnetID2":<Enter public subnetID here>
    "AWSAssetsBucket":<Enter AWSAssetsBucket here>,
    "AWSRegion":<Enter AWSRegion here}>
    }
    ```

Note: Create an IAM role with the permission as specified in the Deployment Steps 1 and add the SecurityGroupID,SubnetId,VPC for the same user. Also, make sure there is no space at the end of secret-values.

## Deployment Information

```
     1.Region in which API Gateway and lambda are deployed:
      REGION="ap-south-1"

     2.S3 bucket for storing thumbnails
      NAME="poker-image" // It could be different bucket name, please add the deployment bucket name in "DeploymentBucket" secret-key in secret-manager.
      REGION="ap-south-1"
```

## Deployment Steps

1.  create IAM policies with following actions:

```{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "secretsmanager:DescribeSecret",
                "secretsmanager:PutSecretValue",
                "logs:*",
                "iam:CreateRole",
                "s3:CreateBucket",
                "iam:AttachRolePolicy",
                "iam:PutRolePolicy",
                "iam:DetachRolePolicy",
                "ec2:DescribeAccountAttributes",
                "s3:DeleteObject",
                "elasticache:CreateCacheCluster",
                "elasticache:DeleteCacheSubnetGroup",
                "execute-api:ManageConnections",
                "iam:GetRole",
                "apigateway:*",
                "ec2:CreateTags",
                "ec2:DeleteNetworkInterface",
                "cloudformation:*",
                "iam:UpdateRoleDescription",
                "iam:DeleteRole",
                "elasticache:DeleteCacheCluster",
                "elasticache:AddTagsToResource",
                "ec2:CreateNetworkInterface",
                "s3:PutObject",
                "s3:GetObject",
                "elasticache:DescribeCacheClusters",
                "ec2:DescribeSubnets",
                "secretsmanager:ListSecrets",
                "ec2:DeleteTags",
                "s3:DeleteObjectVersion",
                "secretsmanager:CreateSecret",
                "s3:ListBucketVersions",
                "s3:ListBucket",
                "iam:PassRole",
                "secretsmanager:GetSecretValue",
                "ec2:DescribeNetworkInterfaces",
                "elasticache:DescribeCacheSubnetGroups",
                "ec2:CreateSecurityGroup",
                "iam:DeleteRolePolicy",
                "elasticache:CreateCacheSubnetGroup",
                "elasticache:CreateCacheSecurityGroup",
                "execute-api:Invoke",
                "ec2:DescribeSecurityGroups",
                "secretsmanager:UpdateSecret",
                "ec2:DescribeVpcs",
                "ec2:DeleteSecurityGroup",
                "redshift:DescribeClusters",
                "lambda:*",
                "elasticache:ModifyCacheCluster",
                "ec2:AttachNetworkInterface",
                "iam:UpdateRole",
                "s3:GetBucketLocation",
                "elasticache:DescribeCacheSecurityGroups",
                "s3:GetObjectVersion",
                "elasticache:ModifyCacheSubnetGroup",
                "iam:TagInstanceProfile",
                "iam:UntagInstanceProfile",
                "iam:ListInstanceProfiles",
                "iam:DeleteInstanceProfile",
                "iam:GetInstanceProfile",
                "iam:RemoveRoleFromInstanceProfile",
                "iam:AddRoleToInstanceProfile",
                "iam:CreateInstanceProfile",
                "iam:ListInstanceProfileTags",
                "iam:ListInstanceProfilesForRole"
            ],
            "Resource": "*"
        }
    ]
}
```

2.  Please add the below AWS Managed Policy to the role for create/ update the AWS Beanstalk and its environment.

AdministratorAccess-AWSElasticBeanstalk

      Note: User should have the above permission in order to deploy using serverless scripts.

3. Add the below variable in code builds environment variable section:

    ```STAGE_NAME: <Your Environment Name>```

4.  Run the following command and assign ACCESS_KEY_ID and SECRET_KEY of the above role that was created:

```
    $ aws configure
```

5.  Run the below command to install dependencies/node modules:

```
    $ npm install
    $ npm install -g serverless@1.61.2
```

6.  Now, build and deploy using below command:

```
    $ npm webpack

    $ After successfully created the webpack build file, go inside the /dist folder and compress all the files.

    $ Compress in Windows:
        $ Compress-Archive -Path ./dist/apihandler.js -DestinationPath ./dist/ apihandler.zip -Update (This is to create zip file in windows)

    $ Compress in MacOS/Linux/Ubuntu:
        $ zip -9rq apihandler.zip .
        OR
        $ zip -r -DestinationPath -Path

    $ serverless deploy --stage dev

    NOTE:--For qa Deployment run command:

    $ serverless deploy --stage qa

    For prod Deployment run command:

    $ serverless deploy --stage prod
```

## Database used is Mongo Atlas

```
    1.Organization Name
      PB School
    2.Cluster Name
      PB School App
    3.Database Name
      poker-school
```

## Postman Collection

#Base Url : `https://1e4mn8zv0j.execute-api.ap-south-1.amazonaws.com` // It may not be exists in future, because it was created for dev env.

#Configure/Update Auth token

```
     1.  Login to https://dashboard.alphabetabox.com/login-credentials
         username: user19
         password: test123
     2.  Inspect Element on Login and copy the Auth token from the console.
     3.  Run the APIs with the controllers name
```

```NOTE: If you change `"ProjectPrefix" value in serverless.yml or pass it via "serverless deploy command" , then you have to change value of "PROJECT_PREFIX" with the same name in buildspec.yml```

FAQ:

1. Do we need to change build commands in prod environment for api server?
   Only need to add environment variable in codebuild and run the code pipeline.

2. Serverless deploy command in build now passing stage qa will need to change in prod?
   Serverless Deploy command will be same (only staging name will be changed)
   Eg: For prod it will be serverless deploy --stage prod

