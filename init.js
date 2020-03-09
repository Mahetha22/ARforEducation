Lean touch scripts:
Rotation
using UnityEngine;
 
namespace Lean.Touch
{
    /// <summary>This script allows you to transform the current GameObject.</summary>
    [HelpURL(LeanTouch.HelpUrlPrefix + "LeanRotate")]
    public class LeanRotate : MonoBehaviour
    {
        [Tooltip("Ignore fingers with StartedOverGui?")]
        public bool IgnoreStartedOverGui = true;
 
        [Tooltip("Ignore fingers with IsOverGui?")]
        public bool IgnoreIsOverGui;
 
        [Tooltip("Allows you to force rotation with a specific amount of fingers (0 = any)")]
        public int RequiredFingerCount;
 
        [Tooltip("Does rotation require an object to be selected?")]
        public LeanSelectable RequiredSelectable;
 
        [Tooltip("The camera we will be used to calculate relative rotations (None = MainCamera)")]
        public Camera Camera;
 
        [Tooltip("Should the rotation be performanced relative to the finger center?")]
        public bool Relative;
 
#if UNITY_EDITOR
        protected virtual void Reset()
        {
            Start();
        }
#endif
 
        protected virtual void Start()
        {
            if (RequiredSelectable == null)
            {
                RequiredSelectable = GetComponent<LeanSelectable>();
            }
        }
 
        protected virtual void Update()
        {
            // Get the fingers we want to use
            var fingers = LeanSelectable.GetFingers(IgnoreStartedOverGui, IgnoreIsOverGui, RequiredFingerCount, RequiredSelectable);
 
            // Calculate the rotation values based on these fingers
            var twistDegrees = LeanGesture.GetTwistDegrees(fingers);
 
            if (twistDegrees != 0.0f)
            {
                if (Relative == true)
                {
                    var twistScreenCenter = LeanGesture.GetScreenCenter(fingers);
 
                    if (transform is RectTransform)
                    {
                        TranslateUI(twistDegrees, twistScreenCenter);
                        RotateUI(twistDegrees);
                    }
                    else
                    {
                        Translate(twistDegrees, twistScreenCenter);
                        Rotate(twistDegrees);
                    }
                }
                else
                {
                    if (transform is RectTransform)
                    {
                        RotateUI(twistDegrees);
                    }
                    else
                    {
                        Rotate(twistDegrees);
                    }
                }
            }
        }
 
        protected virtual void TranslateUI(float twistDegrees, Vector2 twistScreenCenter)
        {
            // Screen position of the transform
            var screenPoint = RectTransformUtility.WorldToScreenPoint(Camera, transform.position);
 
            // Twist screen point around the twistScreenCenter by twistDegrees
            var twistRotation = Quaternion.Euler(0.0f, 0.0f, twistDegrees);
            var screenDelta   = twistRotation * (screenPoint - twistScreenCenter);
 
            screenPoint.x = twistScreenCenter.x + screenDelta.x;
            screenPoint.y = twistScreenCenter.y + screenDelta.y;
 
            // Convert back to world space
            var worldPoint = default(Vector3);
 
            if (RectTransformUtility.ScreenPointToWorldPointInRectangle(transform.parent as RectTransform, screenPoint, Camera, out worldPoint) == true)
            {
                transform.position = worldPoint;
            }
        }
 
        protected virtual void Translate(float twistDegrees, Vector2 twistScreenCenter)
        {
            // Make sure the camera exists
            var camera = LeanTouch.GetCamera(Camera, gameObject);
 
            if (camera != null)
            {
                // Screen position of the transform
                var screenPoint = camera.WorldToScreenPoint(transform.position);
 
                // Twist screen point around the twistScreenCenter by twistDegrees
                var twistRotation = Quaternion.Euler(0.0f, 0.0f, twistDegrees);
                var screenDelta   = twistRotation * ((Vector2)screenPoint - twistScreenCenter);
 
                screenPoint.x = twistScreenCenter.x + screenDelta.x;
                screenPoint.y = twistScreenCenter.y + screenDelta.y;
 
                // Convert back to world space
                transform.position = camera.ScreenToWorldPoint(screenPoint);
            }
            else
            {
                Debug.LogError("Failed to find camera. Either tag your cameras MainCamera, or set one in this component.", this);
            }
        }
 
        protected virtual void RotateUI(float twistDegrees)
        {
            transform.rotation *= Quaternion.Euler(0.0f, 0.0f, twistDegrees);
        }
 
        protected virtual void Rotate(float twistDegrees)
        {
            // Make sure the camera exists
            var camera = LeanTouch.GetCamera(Camera, gameObject);
 
            if (camera != null)
            {
                var axis = transform.InverseTransformDirection(camera.transform.forward);
 
                transform.rotation *= Quaternion.AngleAxis(twistDegrees, axis);
            }
            else
            {
                Debug.LogError("Failed to find camera. Either tag your cameras MainCamera, or set one in this component.", this);
            }
        }
    }
}


Scale

ObjectShader.cs
Shader "Lean/Touch/Object"
{
    Properties
    {
        _MainTex("Main Tex", 2D) = "white" {}
        _Color("Color", Color) = (1.0, 1.0, 1.0, 1.0)
        _Color1("Color 1", Color) = (1.0, 0.5, 0.5, 1.0)
        _Color2("Color 2", Color) = (0.5, 0.5, 1.0, 1.0)
        _Rim("Rim", Float) = 1.0
        _Shift("Shift", Float) = 1.0
    }
 
    SubShader
    {
        Tags
        {
            "Queue" = "Geometry"
            "PreviewType" = "Sphere"
            "DisableBatching" = "True"
        }
 
        Pass
        {
            CGPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
 
            sampler2D _MainTex;
            float4    _Color;
            float4    _Color1;
            float4    _Color2;
            float     _Rim;
            float     _Shift;
 
            struct a2v
            {
                float4 vertex    : POSITION;
                float2 texcoord0 : TEXCOORD0;
                float3 normal    : NORMAL;
                float4 color     : COLOR;
            };
 
            struct v2f
            {
                float4 vertex : SV_POSITION;
                float2 uv     : TEXCOORD0;
                float3 normal : TEXCOORD1;
                float3 direct : TEXCOORD2;
                float4 color  : COLOR;
            };
 
            void Vert(a2v i, out v2f o)
            {
                o.vertex = UnityObjectToClipPos(i.vertex);
                o.uv     = i.texcoord0;
                o.normal = mul((float3x3)unity_ObjectToWorld, i.normal.xyz).xyz;
                o.direct = _WorldSpaceCameraPos - mul(unity_ObjectToWorld, i.vertex).xyz;
                o.color  = i.color * _Color;
            }
 
            void Frag(v2f i, out float4 o:COLOR0)
            {
                float d = (dot(normalize(i.normal), normalize(i.direct)));
                float r = _Shift - pow(1.0f - d, _Rim);
 
                o = tex2D(_MainTex, i.uv) * lerp(_Color1, _Color2, r) * i.color;
            }
            ENDCG
        } // Pass
    } // SubShader
} // Shader


BoundingBoxRendere.cs

Vuforia
using UnityEngine;
using Vuforia;
 
/// <summary>
/// A component that renders a bounding box using lines.
/// </summary>
public class BoundingBoxRenderer : MonoBehaviour
{
    #region PRIVATE_MEMBERS
 
    private Material mLineMaterial = null;
 
    #endregion // PRIVATE_MEMBERS
    
 
 
    private void OnRenderObject()
    {
        GL.PushMatrix();
        GL.MultMatrix(transform.localToWorldMatrix);
 
        if (mLineMaterial == null)
        {
            // We "borrow" the default material from a primitive.
            // This ensures that, even on mobile platforms,
            // we always get a valid material at runtime,
            // as on mobile Unity can strip away unused shaders at build-time. 
            var tempObj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            var cubeRenderer = tempObj.GetComponent<MeshRenderer>();
            
            mLineMaterial = new Material(cubeRenderer.material);
            mLineMaterial.color = Color.white;
            
            Destroy(tempObj);
        }
 
        mLineMaterial.SetPass(0);
        mLineMaterial.color = Color.white;
        
        GL.Begin(GL.LINES);
 
        // Bottom XZ quad
        GL.Vertex3(-0.5f, -0.5f, -0.5f);
        GL.Vertex3( 0.5f, -0.5f, -0.5f);
 
        GL.Vertex3(0.5f, -0.5f, -0.5f);
        GL.Vertex3(0.5f, -0.5f,  0.5f);
 
        GL.Vertex3( 0.5f, -0.5f, 0.5f);
        GL.Vertex3(-0.5f, -0.5f, 0.5f);
 
        GL.Vertex3(-0.5f, -0.5f, 0.5f);
        GL.Vertex3(-0.5f, -0.5f, -0.5f);
 
        // Top XZ quad
        GL.Vertex3(-0.5f, 0.5f, -0.5f);
        GL.Vertex3(0.5f,  0.5f, -0.5f);
 
        GL.Vertex3(0.5f,  0.5f, -0.5f);
        GL.Vertex3(0.5f,  0.5f, 0.5f);
 
        GL.Vertex3(0.5f,  0.5f, 0.5f);
        GL.Vertex3(-0.5f, 0.5f, 0.5f);
 
        GL.Vertex3(-0.5f, 0.5f, 0.5f);
        GL.Vertex3(-0.5f, 0.5f, -0.5f);
 
        // Side lines
        GL.Vertex3(-0.5f, -0.5f, -0.5f);
        GL.Vertex3(-0.5f,  0.5f, -0.5f);
 
        GL.Vertex3(0.5f, -0.5f, -0.5f);
        GL.Vertex3(0.5f,  0.5f, -0.5f);
 
        GL.Vertex3(0.5f, -0.5f, 0.5f);
        GL.Vertex3(0.5f,  0.5f, 0.5f);
 
        GL.Vertex3(-0.5f, -0.5f, 0.5f);
        GL.Vertex3(-0.5f,  0.5f, 0.5f);
 
        GL.End();
 
        GL.PopMatrix();
    }
}


DefaultInitialisationErrorHandler.cs
using UnityEngine;
using Vuforia;
 
/// <summary>
/// A custom handler that registers for Vuforia initialization errors
/// 
/// Changes made to this file could be overwritten when upgrading the Vuforia version. 
/// When implementing custom error handler behavior, consider inheriting from this class instead.
/// </summary>
public class DefaultInitializationErrorHandler : VuforiaMonoBehaviour
{
    #region Vuforia_lifecycle_events
 
    public void OnVuforiaInitializationError(VuforiaUnity.InitError initError)
    {
        if (initError != VuforiaUnity.InitError.INIT_SUCCESS)
        {
            SetErrorCode(initError);
            SetErrorOccurred(true);
        }
    }
 
    #endregion // Vuforia_lifecycle_events
 
    #region PRIVATE_MEMBER_VARIABLES
 
    string mErrorText = "";
    bool mErrorOccurred;
 
    const string headerLabel = "Vuforia Engine Initialization Error";
 
    GUIStyle bodyStyle;
    GUIStyle headerStyle;
    GUIStyle footerStyle;
 
    Texture2D bodyTexture;
    Texture2D headerTexture;
    Texture2D footerTexture;
 
    #endregion // PRIVATE_MEMBER_VARIABLES
 
    #region UNTIY_MONOBEHAVIOUR_METHODS
 
    void Awake()
    {
        // Check for an initialization error on start.
        VuforiaRuntime.Instance.RegisterVuforiaInitErrorCallback(OnVuforiaInitializationError);
    }
 
    void Start()
    {
        SetupGUIStyles();
    }
 
    void OnGUI()
    {
        // On error, create a full screen window.
        if (mErrorOccurred)
            GUI.Window(0, new Rect(0, 0, Screen.width, Screen.height), DrawWindowContent, "");
    }
 
    /// <summary>
    ///     When this game object is destroyed, it unregisters itself as event handler
    /// </summary>
    void OnDestroy()
    {
        VuforiaRuntime.Instance.UnregisterVuforiaInitErrorCallback(OnVuforiaInitializationError);
    }
 
    #endregion // UNTIY_MONOBEHAVIOUR_METHODS
 
    #region PRIVATE_METHODS
 
    void DrawWindowContent(int id)
    {
        var headerRect = new Rect(0, 0, Screen.width, Screen.height / 8);
        var bodyRect = new Rect(0, Screen.height / 8, Screen.width, Screen.height / 8 * 6);
        var footerRect = new Rect(0, Screen.height - Screen.height / 8, Screen.width, Screen.height / 8);
 
        GUI.Label(headerRect, headerLabel, headerStyle);
        GUI.Label(bodyRect, mErrorText, bodyStyle);
 
        if (GUI.Button(footerRect, "Close", footerStyle))
        {
#if UNITY_EDITOR
                    UnityEditor.EditorApplication.isPlaying = false;
    #else
            Application.Quit();
#endif
        }
    }
 
    void SetErrorCode(VuforiaUnity.InitError errorCode)
    {
        switch (errorCode)
        {
            case VuforiaUnity.InitError.INIT_EXTERNAL_DEVICE_NOT_DETECTED:
                mErrorText =
                    "Failed to initialize the Vuforia Engine because this " +
                    "device is not docked with required external hardware.";
                break;
            case VuforiaUnity.InitError.INIT_LICENSE_ERROR_MISSING_KEY:
                mErrorText =
                    "Vuforia Engine App key is missing. Please get a valid key " +
                    "by logging into your account at developer.vuforia.com " +
                    "and creating a new project.";
                break;
            case VuforiaUnity.InitError.INIT_LICENSE_ERROR_INVALID_KEY:
                mErrorText =
                    "Vuforia Engine App key is invalid. " +
                    "Please get a valid key by logging into your account at " +
                    "developer.vuforia.com and creating a new project. \n\n" +
                    getKeyInfo();
                break;
            case VuforiaUnity.InitError.INIT_LICENSE_ERROR_NO_NETWORK_TRANSIENT:
                mErrorText = "Unable to contact server. Please try again later.";
                break;
            case VuforiaUnity.InitError.INIT_LICENSE_ERROR_NO_NETWORK_PERMANENT:
                mErrorText = "No network available. Please make sure you are connected to the Internet.";
                break;
            case VuforiaUnity.InitError.INIT_LICENSE_ERROR_CANCELED_KEY:
                mErrorText =
                    "This App license key has been cancelled and may no longer be used. " +
                    "Please get a new license key. \n\n" +
                    getKeyInfo();
                break;
            case VuforiaUnity.InitError.INIT_LICENSE_ERROR_PRODUCT_TYPE_MISMATCH:
                mErrorText =
                    "Vuforia Engine App key is not valid for this product. Please get a valid key " +
                    "by logging into your account at developer.vuforia.com and choosing the " +
                    "right product type during project creation. \n\n" +
                    getKeyInfo() + " \n\n" +
                    "Note that Universal Windows Platform (UWP) apps require " +
                    "a license key created on or after August 9th, 2016.";
                break;
            case VuforiaUnity.InitError.INIT_NO_CAMERA_ACCESS:
                mErrorText = 
                    "User denied Camera access to this app.\n" +
                    "To restore, enable Camera access in Settings:\n" +
                    "Settings > Privacy > Camera > " + Application.productName + "\n" +
                    "Also verify that the Camera is enabled in:\n" +
                    "Settings > General > Restrictions.";
                break;
            case VuforiaUnity.InitError.INIT_DEVICE_NOT_SUPPORTED:
                mErrorText = "Failed to initialize Vuforia Engine because this device is not supported.";
                break;
            case VuforiaUnity.InitError.INIT_ERROR:
                mErrorText = "Failed to initialize Vuforia Engine.";
                break;
        }
 
        // Prepend the error code in red
        mErrorText = "<color=red>" + errorCode.ToString().Replace("_", " ") + "</color>\n\n" + mErrorText;
 
        // Remove rich text tags for console logging
        var errorTextConsole = mErrorText.Replace("<color=red>", "").Replace("</color>", "");
 
        Debug.LogError("Vuforia Engine initialization failed: " + errorCode + "\n\n" + errorTextConsole);
    }
 
    void SetErrorOccurred(bool errorOccurred)
    {
        mErrorOccurred = errorOccurred;
    }
 
    string getKeyInfo()
    {
        string key = VuforiaConfiguration.Instance.Vuforia.LicenseKey;
        string keyInfo;
        if (key.Length > 10)
            keyInfo =
                "Your current key is <color=red>" + key.Length + "</color> characters in length. " +
                "It begins with <color=red>" + key.Substring(0, 5) + "</color> " +
                "and ends with <color=red>" + key.Substring(key.Length - 5, 5) + "</color>.";
        else
            keyInfo =
                "Your current key is <color=red>" + key.Length + "</color> characters in length. \n" +
                "The key is: <color=red>" + key + "</color>.";
        return keyInfo;
    }
 
    void SetupGUIStyles()
    {
        // Called from Start() to determine physical size of device for text sizing
        var shortSidePixels = Screen.width < Screen.height ? Screen.width : Screen.height;
        var shortSideInches = shortSidePixels / Screen.dpi;
        var physicalSizeMultiplier = shortSideInches > 4.0f ? 2 : 1;
 
        // Create 1x1 pixel background textures for body, header, and footer
        bodyTexture = CreateSinglePixelTexture(Color.white);
        headerTexture = CreateSinglePixelTexture(new Color(
            Mathf.InverseLerp(0, 255, 220),
            Mathf.InverseLerp(0, 255, 220),
            Mathf.InverseLerp(0, 255, 220))); // RGB(220)
        footerTexture = CreateSinglePixelTexture(new Color(
            Mathf.InverseLerp(0, 255, 35),
            Mathf.InverseLerp(0, 255, 178),
            Mathf.InverseLerp(0, 255, 0))); // RGB(35,178,0)
 
        // Create body style and set values
        bodyStyle = new GUIStyle();
        bodyStyle.normal.background = bodyTexture;
        bodyStyle.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        bodyStyle.fontSize = (int) (18 * physicalSizeMultiplier * Screen.dpi / 160);
        bodyStyle.normal.textColor = Color.black;
        bodyStyle.wordWrap = true;
        bodyStyle.alignment = TextAnchor.MiddleCenter;
        bodyStyle.padding = new RectOffset(40, 40, 0, 0);
 
        // Duplicate body style and change necessary values
        headerStyle = new GUIStyle(bodyStyle);
        headerStyle.normal.background = headerTexture;
        headerStyle.fontSize = (int) (24 * physicalSizeMultiplier * Screen.dpi / 160);
 
        // Duplicate body style and change necessary values
        footerStyle = new GUIStyle(bodyStyle);
        footerStyle.normal.background = footerTexture;
        footerStyle.normal.textColor = Color.white;
        footerStyle.fontSize = (int) (28 * physicalSizeMultiplier * Screen.dpi / 160);
    }
 
    Texture2D CreateSinglePixelTexture(Color color)
    {
        // Called by SetupGUIStyles() to create 1x1 texture
        var texture = new Texture2D(1, 1, TextureFormat.ARGB32, false);
        texture.SetPixel(0, 0, color);
        texture.Apply();
        return texture;
    }
 
    #endregion // PRIVATE_METHODS
}


DefaultModelRecoEventHandler.cs

using System.Linq;
using UnityEngine;
using Vuforia;
 
/// <summary>
/// A default implementation of Model Reco Event Handler.
/// It registers itself at the ModelRecoBehaviour and is notified of new search results.
/// </summary>
public class DefaultModelRecoEventHandler : MonoBehaviour, IObjectRecoEventHandler
{
    #region PRIVATE_MEMBER_VARIABLES
 
    private ModelTargetBehaviour mLastRecoModelTarget;
    private bool mSearching;
    private float mLastStatusCheckTime;
 
    #endregion // PRIVATE_MEMBER_VARIABLES
 
 
    #region PROTECTED_MEMBER_VARIABLES
 
    // ModelRecoBehaviour reference to avoid lookups
    protected ModelRecoBehaviour mModelRecoBehaviour;
    
    // Target Finder reference to avoid lookups
    protected TargetFinder mTargetFinder;
 
    #endregion  // PROTECTED_MEMBER_VARIABLES
 
 
    #region PUBLIC_VARIABLES
 
    /// <summary>
    /// The Model Target used as template when a Model is recognized.
    /// </summary>
    [Tooltip("The Model Target used as Template when a model is recognized.")]
    public ModelTargetBehaviour ModelTargetTemplate;
 
    /// <summary>
    /// Whether the model should be augmented with a bounding box.
    /// Only applicable to Template model targets.
    /// </summary>
    [Tooltip("Whether the model should be augmented with a bounding box.")]
    public bool ShowBoundingBox;
 
    /// <summary>
    /// Can be set in the Unity inspector to display error messages in UI.
    /// </summary>
    [Tooltip("UI Text label to display model reco errors.")]
    public UnityEngine.UI.Text ModelRecoErrorText;
 
    /// <summary>
    /// Can be set in the Unity inspector to tell Vuforia whether it should:
    /// - stop searching for new models, once a first model was found,
    ///   or:
    /// - continue searching for new models, even after a first model was found.
    /// </summary>
    [Tooltip("Whether Vuforia should stop searching for other models, after the first model was found.")]
    public bool StopSearchWhenModelFound = false;
 
    /// <summary>
    /// Can be set in the Unity inspector to tell Vuforia whether it should:
    /// - stop searching for new models, while a target is being tracked and is in view,
    ///   or:
    /// - continue searching for new models, even if a target is currently being tracked.
    /// </summary>
    [Tooltip("Whether Vuforia should stop searching for other models, while current model is tracked and visible.")]
    public bool StopSearchWhileTracking = true;//true by default, as this is the recommended behaviour
 
    #endregion // PUBLIC_VARIABLES
 
 
 
    #region UNITY_MONOBEHAVIOUR_METHODS
 
    /// <summary>
    /// register for events at the ModelRecoBehaviour
    /// </summary>
    void Start()
    {
        // register this event handler at the model reco behaviour
        var modelRecoBehaviour = GetComponent<ModelRecoBehaviour>();
        if (modelRecoBehaviour)
        {
            modelRecoBehaviour.RegisterEventHandler(this);
        }
 
        // remember modelRecoBehaviour for later
        mModelRecoBehaviour = modelRecoBehaviour;
    }
 
    void Update()
    {
        if (!VuforiaARController.Instance.HasStarted)
            return;
 
        if (mTargetFinder == null)
            return;
 
        
        // Check periodically if model target is tracked and in view
        // The test is not necessary when the search is stopped after first model was found
        float elapsed = Time.realtimeSinceStartup - mLastStatusCheckTime;
        if (!StopSearchWhenModelFound && StopSearchWhileTracking && elapsed > 0.5f)
        {
            mLastStatusCheckTime = Time.realtimeSinceStartup;
 
            if (mSearching)
            {
                if (IsModelTrackedInView(mLastRecoModelTarget))
                {
                    // Switch Model Reco OFF when model is being tracked/in-view
                    mModelRecoBehaviour.ModelRecoEnabled = false;
                    mSearching = false;
                }
            }
            else
            {
                if (!IsModelTrackedInView(mLastRecoModelTarget))
                {
                    // Switch Mode Reco ON when no model is tracked/in-view
                    mModelRecoBehaviour.ModelRecoEnabled = true;
                    mSearching = true;
                }
            }
        }
    }
    
 
    private void OnDestroy()
    {
        if (mModelRecoBehaviour != null)
        {
            mModelRecoBehaviour.UnregisterEventHandler(this);
        }
 
        mModelRecoBehaviour = null;
    }
 
    #endregion // UNITY_MONOBEHAVIOUR_METHODS
 
 
 
    #region IModelRecoEventHandler_IMPLEMENTATION
 
    /// <summary>
    /// called when TargetFinder has been initialized successfully
    /// </summary>
    public void OnInitialized(TargetFinder targetFinder)
    {
        Debug.Log("ModelReco initialized.");
 
        // Keep a reference to the Target Finder
        mTargetFinder = targetFinder;
    }
 
    /// <summary>
    /// visualize initialization errors
    /// </summary>
    public void OnInitError(TargetFinder.InitState initError)
    {
        // Reset target finder reference
        mTargetFinder = null;
 
        Debug.LogError("Model Reco init error: " + initError.ToString());
        ShowErrorMessageInUI(initError.ToString());
    }
 
    /// <summary>
    /// visualize update errors
    /// </summary>
    public void OnUpdateError(TargetFinder.UpdateState updateError)
    {
        Debug.LogError("Model Reco update error: " + updateError.ToString());
        ShowErrorMessageInUI(updateError.ToString());
    }
 
    /// <summary>
    /// when we start scanning, clear all trackables
    /// </summary>
    public void OnStateChanged(bool searching)
    {
        Debug.Log("ModelReco: state changed: " + (searching ? "searching" : "not searching"));
 
        mSearching = searching;
 
        if (searching)
        {
            // clear all known trackables
            if (mTargetFinder != null)
                mTargetFinder.ClearTrackables(false);
        }
    }
 
    /// <summary>
    /// Handles new search results.
    /// </summary>
    /// <param name="searchResult"></param>
    public virtual void OnNewSearchResult(TargetFinder.TargetSearchResult searchResult)
    {
        Debug.Log("ModelReco: new search result available: " + searchResult.TargetName);
 
        // Find or create the referenced model target
        GameObject modelTargetGameObj = null;
        bool builtFromTemplate = false;
        var existingModelTarget = FindExistingModelTarget((TargetFinder.ModelRecoSearchResult)searchResult);
        if (existingModelTarget)
        {
            modelTargetGameObj = existingModelTarget.gameObject;
            builtFromTemplate = false;
        }
        else if (ModelTargetTemplate)
        {
            modelTargetGameObj = Instantiate(ModelTargetTemplate.gameObject);
            builtFromTemplate = true;
        }
 
        if (!modelTargetGameObj)
        {
            Debug.LogError("Could not create a Model Target.");
            return;
        }
 
        // Enable the new search result as a Model Target
        ModelTargetBehaviour mtb = mTargetFinder.EnableTracking(
            searchResult, modelTargetGameObj) as ModelTargetBehaviour;
 
        if (mtb)
        {
            mLastRecoModelTarget = mtb;
 
            // If the model target was created from a template,
            // we augment it with a bounding box game object
            if (builtFromTemplate && ShowBoundingBox)
            {
                var modelBoundingBox = mtb.ModelTarget.GetBoundingBox();
                var bboxGameObj = CreateBoundingBox(mtb.ModelTarget.Name, modelBoundingBox);
 
                // Parent the bounding box under the model target.
                bboxGameObj.transform.SetParent(modelTargetGameObj.transform, false);
            }
 
            if (StopSearchWhenModelFound)
            {
                // Stop the target finder
                mModelRecoBehaviour.ModelRecoEnabled = false;
            }
        }
    }
 
    #endregion // IModelRecoEventHandler_IMPLEMENTATION
 
 
 
    #region PRIVATE_METHODS
 
    private ModelTargetBehaviour FindExistingModelTarget(TargetFinder.ModelRecoSearchResult searchResult)
    {
        var modelTargetsInScene = Resources.FindObjectsOfTypeAll<ModelTargetBehaviour>().ToList().Where(mt => mt.ModelTargetType == ModelTargetType.PREDEFINED).ToArray();
 
        if (modelTargetsInScene == null || modelTargetsInScene.Length == 0)
            return null;
 
        string targetName = searchResult.TargetName;
        //string targetUniqueId = searchResult.UniqueTargetId;
 
        foreach (var mt in modelTargetsInScene)
        {
            if (mt.TrackableName == targetName)
            {
                mt.gameObject.SetActive(true);
                return mt;
            }
        }
 
        return null;
    }
 
 
    private GameObject CreateBoundingBox(string modelTargetName, OrientedBoundingBox3D bbox)
    {
        var bboxGameObj = new GameObject(modelTargetName + "_BoundingBox");
        bboxGameObj.transform.localPosition = bbox.Center;
        bboxGameObj.transform.localRotation = Quaternion.identity;
        bboxGameObj.transform.localScale = 2 * bbox.HalfExtents;
        bboxGameObj.AddComponent<BoundingBoxRenderer>();
        return bboxGameObj;
    }
 
    private void ShowErrorMessageInUI(string text)
    {
        if (ModelRecoErrorText)
            ModelRecoErrorText.text = text;
    }
 
    public static Bounds GetModelTargetWorldBounds(ModelTargetBehaviour mtb)
    {
        var bbox = mtb.ModelTarget.GetBoundingBox();
        var localCenter = bbox.Center;
        var localExtents = bbox.HalfExtents;
 
        // transform local center to World space
        var worldCenter = mtb.transform.TransformPoint(localCenter);
 
        // transform the local extents to World space
        var axisX = mtb.transform.TransformVector(localExtents.x, 0, 0);
        var axisY = mtb.transform.TransformVector(0, localExtents.y, 0);
        var axisZ = mtb.transform.TransformVector(0, 0, localExtents.z);
        
        Vector3 worldExtents = Vector3.zero;
        worldExtents.x = Mathf.Abs(axisX.x) + Mathf.Abs(axisY.x) + Mathf.Abs(axisZ.x);
        worldExtents.y = Mathf.Abs(axisX.y) + Mathf.Abs(axisY.y) + Mathf.Abs(axisZ.y);
        worldExtents.z = Mathf.Abs(axisX.z) + Mathf.Abs(axisY.z) + Mathf.Abs(axisZ.z);
 
        return new Bounds { center = worldCenter, extents = worldExtents };
    }
 
    private bool IsModelTrackedInView(ModelTargetBehaviour modelTarget)
    {
        if (!modelTarget)
            return false;
 
        if (modelTarget.CurrentStatus == TrackableBehaviour.Status.NO_POSE)
            return false;
 
        var cam = DigitalEyewearARController.Instance.PrimaryCamera;
        if (!cam)
            return false;
 
        // Compute the center of the model in World coordinates
        Bounds modelBounds = GetModelTargetWorldBounds(modelTarget);
        
        var frustumPlanes = GeometryUtility.CalculateFrustumPlanes(cam);
        return GeometryUtility.TestPlanesAABB(frustumPlanes, modelBounds);
    }
 
    #endregion PRIVATE_METHODS
 
 
    #region PUBLIC_METHODS
 
    public TargetFinder GetTargetFinder()
    {
        return mTargetFinder;
    }
 
 
    public void ResetModelReco(bool destroyGameObjects)
    {
        var objectTracker = TrackerManager.Instance.GetTracker<ObjectTracker>();
 
        if (objectTracker != null)
        {
            objectTracker.Stop();
 
            if (mTargetFinder != null)
            {
                mTargetFinder.ClearTrackables(destroyGameObjects);
                mTargetFinder.Stop();
                mTargetFinder.StartRecognition();
            }
            else
            {
                Debug.LogError("Could not reset TargetFinder");
            }
 
            objectTracker.Start();
        }
        else
        {
            Debug.LogError("Could not reset ObjectTracker");
        }
    }
 
    #endregion  // PUBLIC_METHODS
}


DefaultTrackableEventHandler.cs 
using UnityEngine;
using Vuforia;
 
/// <summary>
/// A custom handler that implements the ITrackableEventHandler interface.
///
/// Changes made to this file could be overwritten when upgrading the Vuforia version.
/// When implementing custom event handler behavior, consider inheriting from this class instead.
/// </summary>
public class DefaultTrackableEventHandler : MonoBehaviour, ITrackableEventHandler
{
    #region PROTECTED_MEMBER_VARIABLES
 
    protected TrackableBehaviour mTrackableBehaviour;
    protected TrackableBehaviour.Status m_PreviousStatus;
    protected TrackableBehaviour.Status m_NewStatus;
 
    #endregion // PROTECTED_MEMBER_VARIABLES
 
    #region UNITY_MONOBEHAVIOUR_METHODS
 
    protected virtual void Start()
    {
        mTrackableBehaviour = GetComponent<TrackableBehaviour>();
        if (mTrackableBehaviour)
            mTrackableBehaviour.RegisterTrackableEventHandler(this);
    }
 
    protected virtual void OnDestroy()
    {
        if (mTrackableBehaviour)
            mTrackableBehaviour.UnregisterTrackableEventHandler(this);
    }
 
    #endregion // UNITY_MONOBEHAVIOUR_METHODS
 
    #region PUBLIC_METHODS
 
    /// <summary>
    ///     Implementation of the ITrackableEventHandler function called when the
    ///     tracking state changes.
    /// </summary>
    public void OnTrackableStateChanged(
        TrackableBehaviour.Status previousStatus,
        TrackableBehaviour.Status newStatus)
    {
        m_PreviousStatus = previousStatus;
        m_NewStatus = newStatus;
 
        if (newStatus == TrackableBehaviour.Status.DETECTED ||
            newStatus == TrackableBehaviour.Status.TRACKED ||
            newStatus == TrackableBehaviour.Status.EXTENDED_TRACKED)
        {
            Debug.Log("Trackable " + mTrackableBehaviour.TrackableName + " found");
            OnTrackingFound();
        }
        else if (previousStatus == TrackableBehaviour.Status.TRACKED &&
                 newStatus == TrackableBehaviour.Status.NO_POSE)
        {
            Debug.Log("Trackable " + mTrackableBehaviour.TrackableName + " lost");
            OnTrackingLost();
        }
        else
        {
            // For combo of previousStatus=UNKNOWN + newStatus=UNKNOWN|NOT_FOUND
            // Vuforia is starting, but tracking has not been lost or found yet
            // Call OnTrackingLost() to hide the augmentations
            OnTrackingLost();
        }
    }
 
    #endregion // PUBLIC_METHODS
 
    #region PROTECTED_METHODS
 
    protected virtual void OnTrackingFound()
    {
        var rendererComponents = GetComponentsInChildren<Renderer>(true);
        var colliderComponents = GetComponentsInChildren<Collider>(true);
        var canvasComponents = GetComponentsInChildren<Canvas>(true);
 
        // Enable rendering:
        foreach (var component in rendererComponents)
            component.enabled = true;
 
        // Enable colliders:
        foreach (var component in colliderComponents)
            component.enabled = true;
 
        // Enable canvas':
        foreach (var component in canvasComponents)
            component.enabled = true;
    }
 
 
    protected virtual void OnTrackingLost()
    {
        var rendererComponents = GetComponentsInChildren<Renderer>(true);
        var colliderComponents = GetComponentsInChildren<Collider>(true);
        var canvasComponents = GetComponentsInChildren<Canvas>(true);
 
        // Disable rendering:
        foreach (var component in rendererComponents)
            component.enabled = false;
 
        // Disable colliders:
        foreach (var component in colliderComponents)
            component.enabled = false;
 
        // Disable canvas':
        foreach (var component in canvasComponents)
            component.enabled = false;
    }
 
    #endregion // PROTECTED_METHODS
}

