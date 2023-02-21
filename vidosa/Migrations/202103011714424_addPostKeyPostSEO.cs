namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addPostKeyPostSEO : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.PostSEOs", "PostKey", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.PostSEOs", "PostKey");
        }
    }
}
